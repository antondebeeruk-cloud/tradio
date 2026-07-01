"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPersonalClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

function toPositiveNumber(value: FormDataEntryValue | null, fallback: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function toNonNegativeNumber(value: FormDataEntryValue | null, fallback: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: optionalString(formData, "full_name"),
    business_name: optionalString(formData, "business_name"),
    trade: optionalString(formData, "trade"),
    phone: optionalString(formData, "phone"),
    logo_url: optionalString(formData, "logo_url"),
    business_address_line_1: optionalString(formData, "business_address_line_1"),
    business_address_line_2: optionalString(formData, "business_address_line_2"),
    business_town: optionalString(formData, "business_town"),
    business_postcode: optionalString(formData, "business_postcode"),
    vat_number: optionalString(formData, "vat_number"),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    redirect(`/settings?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  redirect(`/settings?message=${encodeURIComponent("Settings saved")}`);
}

export async function createSavedQuoteItem(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = getString(formData, "name");
  const description = getString(formData, "description");
  const itemType = getString(formData, "item_type") || "service";
  const defaultQuantity = toPositiveNumber(formData.get("default_quantity"), 1);
  const unitPrice = toNonNegativeNumber(formData.get("unit_price"), 0);

  if (!name || !description) {
    redirect(
      `/settings?message=${encodeURIComponent(
        "Add a name and description for the saved item.",
      )}`,
    );
  }

  if (!["service", "product", "fee"].includes(itemType)) {
    redirect(`/settings?message=${encodeURIComponent("Choose a valid item type.")}`);
  }

  const { error } = await supabase.from("saved_quote_items").insert({
    user_id: user.id,
    name,
    description,
    item_type: itemType,
    default_quantity: defaultQuantity,
    unit_price: unitPrice,
  });

  if (error) {
    redirect(`/settings?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/quotes/new");
  redirect(`/settings?message=${encodeURIComponent("Saved quote item added")}`);
}

export async function deleteSavedQuoteItem(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect(`/settings?message=${encodeURIComponent("Saved item not found")}`);
  }

  const { error } = await supabase
    .from("saved_quote_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/settings?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/quotes/new");
  redirect(`/settings?message=${encodeURIComponent("Saved quote item deleted")}`);
}

export async function changePassword(formData: FormData) {
  const currentPassword = getString(formData, "current_password");
  const newPassword = getString(formData, "new_password");
  const confirmation = getString(formData, "password_confirmation");

  if (newPassword.length < 8) {
    redirect(`/settings?message=${encodeURIComponent("Use at least 8 characters for the new password.")}#change-password`);
  }
  if (newPassword !== confirmation) {
    redirect(`/settings?message=${encodeURIComponent("The new passwords do not match.")}#change-password`);
  }
  if (currentPassword === newPassword) {
    redirect(`/settings?message=${encodeURIComponent("Choose a new password that is different from the current one.")}#change-password`);
  }

  const supabase = await createPersonalClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login?message=Please log in again.");

  const { error: verificationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verificationError) {
    redirect(`/settings?message=${encodeURIComponent("Your current password is incorrect.")}#change-password`);
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    redirect(`/settings?message=${encodeURIComponent(error.message)}#change-password`);
  }

  revalidatePath("/", "layout");
  redirect(`/settings?message=${encodeURIComponent("Password changed successfully.")}#change-password`);
}
