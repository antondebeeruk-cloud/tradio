"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function createCustomer(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = getString(formData, "name");

  if (!name) {
    redirect(
      `/customers/new?message=${encodeURIComponent("Customer name is required")}`,
    );
  }

  const { error } = await supabase.from("customers").insert({
    user_id: user.id,
    name,
    email: optionalString(formData, "email"),
    phone: optionalString(formData, "phone"),
    address_line_1: optionalString(formData, "address_line_1"),
    address_line_2: optionalString(formData, "address_line_2"),
    town: optionalString(formData, "town"),
    postcode: optionalString(formData, "postcode"),
    notes: optionalString(formData, "notes"),
  });

  if (error) {
    redirect(`/customers/new?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/customers");
  redirect(`/customers?message=${encodeURIComponent("Customer added")}`);
}

export async function updateCustomer(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");
  const name = getString(formData, "name");

  if (!id) {
    redirect(`/customers?message=${encodeURIComponent("Customer not found")}`);
  }

  if (!name) {
    redirect(
      `/customers/${id}/edit?message=${encodeURIComponent(
        "Customer name is required",
      )}`,
    );
  }

  const { error } = await supabase
    .from("customers")
    .update({
      name,
      email: optionalString(formData, "email"),
      phone: optionalString(formData, "phone"),
      address_line_1: optionalString(formData, "address_line_1"),
      address_line_2: optionalString(formData, "address_line_2"),
      town: optionalString(formData, "town"),
      postcode: optionalString(formData, "postcode"),
      notes: optionalString(formData, "notes"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/customers/${id}/edit?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}/edit`);
  redirect(`/customers?message=${encodeURIComponent("Customer updated")}`);
}

export async function deleteCustomer(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect(`/customers?message=${encodeURIComponent("Customer not found")}`);
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      `/customers?message=${encodeURIComponent(
        "This customer cannot be deleted while they have quotes or invoices.",
      )}`,
    );
  }

  revalidatePath("/customers");
  redirect(`/customers?message=${encodeURIComponent("Customer deleted")}`);
}
