"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function acceptPortalQuote(formData: FormData) {
  const token = getString(formData, "token");

  if (!token) {
    redirect("/portal/not-found");
  }

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("customer_portal_links")
    .select("id, user_id, quote_id, document_type")
    .eq("token", token)
    .maybeSingle();

  if (!link || link.document_type !== "quote" || !link.quote_id) {
    redirect(`/portal/${token}?message=${encodeURIComponent("Quote not found.")}`);
  }

  const now = new Date().toISOString();

  const { error } = await admin
    .from("quotes")
    .update({
      status: "accepted",
      updated_at: now,
    })
    .eq("id", link.quote_id)
    .eq("user_id", link.user_id);

  if (error) {
    redirect(`/portal/${token}?message=${encodeURIComponent(error.message)}`);
  }

  await admin
    .from("customer_portal_links")
    .update({
      accepted_at: now,
      updated_at: now,
    })
    .eq("id", link.id);

  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  redirect(`/portal/${token}?message=${encodeURIComponent("Quote accepted")}`);
}
