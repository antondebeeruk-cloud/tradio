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

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
