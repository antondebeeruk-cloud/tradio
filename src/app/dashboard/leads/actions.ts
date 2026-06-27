"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createMockLeadForUser } from "@/lib/leads/ingest";
import { checkLeadsMailbox } from "@/lib/leads/imap";
import { generateLeadEmail } from "@/lib/lead-email";
import { createClient } from "@/lib/supabase/server";

const leadStatuses = ["new", "contacted", "quoted", "won", "lost", "spam"];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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

export async function updateLeadStatus(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");
  const status = getString(formData, "status");

  if (!id || !leadStatuses.includes(status)) {
    redirect(`/dashboard/leads?message=${encodeURIComponent("Invalid lead status.")}`);
  }

  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/dashboard/leads?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/leads");
  redirect(`/dashboard/leads?message=${encodeURIComponent("Lead updated")}`);
}

export async function markLeadAsSpam(formData: FormData) {
  formData.set("status", "spam");
  await updateLeadStatus(formData);
}

export async function deleteLead(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect(`/dashboard/leads?message=${encodeURIComponent("Lead not found.")}`);
  }

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/dashboard/leads?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/leads");
  redirect(`/dashboard/leads?message=${encodeURIComponent("Lead deleted")}`);
}

async function ensureLeadEmail() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("business_name, full_name, lead_email_address")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (profile?.lead_email_address) {
    return { leadEmailAddress: profile.lead_email_address, supabase, user };
  }

  const leadEmail = generateLeadEmail({
    businessName: profile?.business_name,
    email: user.email,
    fullName: profile?.full_name,
  });

  const { error: updateError } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...leadEmail, updated_at: new Date().toISOString() });

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { leadEmailAddress: leadEmail.lead_email_address, supabase, user };
}

export async function createMockLead() {
  try {
    const { leadEmailAddress, supabase, user } = await ensureLeadEmail();
    await createMockLeadForUser({
      leadEmailAddress,
      supabase,
      userId: user.id,
    });
  } catch (error) {
    redirect(
      `/dashboard/leads?message=${encodeURIComponent(
        error instanceof Error ? error.message : "Mock lead could not be created.",
      )}`,
    );
  }

  revalidatePath("/dashboard/leads");
  redirect(`/dashboard/leads?message=${encodeURIComponent("Mock lead created")}`);
}

export async function checkMailboxNow() {
  await requireUser();

  let message = "";

  try {
    const result = await checkLeadsMailbox();
    const skippedCount = Object.values(result.skipped).reduce(
      (total, count) => total + count,
      0,
    );
    const failedCount = Object.values(result.failed).reduce(
      (total, count) => total + count,
      0,
    );
    const skippedReasons = Object.entries(result.skipped)
      .map(([reason, count]) => `${reason}: ${count}`)
      .join(", ");
    const failedReasons = Object.entries(result.failed)
      .map(([reason, count]) => `${reason}: ${count}`)
      .join(", ");
    const recipients = result.recipients.length
      ? ` Recipients seen: ${result.recipients.join(", ")}.`
      : "";
    message = `${result.processed} email${
      result.processed === 1 ? "" : "s"
    } processed. ${result.mailboxMessages} in ${result.mailbox}, ${
      result.found
    } found, ${result.inspected} inspected, ${skippedCount} skipped, ${failedCount} failed.${
      skippedReasons ? ` Skipped: ${skippedReasons}.` : ""
    }${failedReasons ? ` Failed: ${failedReasons}.` : ""}${recipients}`;
  } catch (error) {
    redirect(
      `/dashboard/leads?message=${encodeURIComponent(
        error instanceof Error ? error.message : "Mailbox sync failed.",
      )}`,
    );
  }

  revalidatePath("/dashboard/leads");
  redirect(`/dashboard/leads?message=${encodeURIComponent(message)}`);
}

export async function convertLeadToCustomer(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  const { data: lead, error } = await supabase
    .from("leads")
    .select("customer_name, from_email, phone, postcode, job_description")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !lead) {
    redirect(`/dashboard/leads?message=${encodeURIComponent(error?.message ?? "Lead not found.")}`);
  }

  const { error: insertError } = await supabase.from("customers").insert({
    email: lead.from_email || null,
    name: lead.customer_name || "New lead",
    notes: lead.job_description || null,
    phone: lead.phone || null,
    postcode: lead.postcode || null,
    user_id: user.id,
  });

  if (insertError) {
    redirect(`/dashboard/leads?message=${encodeURIComponent(insertError.message)}`);
  }

  await supabase.from("leads").update({ status: "contacted" }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/customers");
  redirect(`/customers?message=${encodeURIComponent("Lead converted to customer")}`);
}

export async function convertLeadToQuote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  const { data: lead, error } = await supabase
    .from("leads")
    .select("customer_name, from_email, phone, postcode, job_description")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !lead) {
    redirect(`/dashboard/leads?message=${encodeURIComponent(error?.message ?? "Lead not found.")}`);
  }

  const { data: customer, error: insertError } = await supabase
    .from("customers")
    .insert({
      email: lead.from_email || null,
      name: lead.customer_name || "New lead",
      notes: lead.job_description || null,
      phone: lead.phone || null,
      postcode: lead.postcode || null,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (insertError || !customer) {
    redirect(`/dashboard/leads?message=${encodeURIComponent(insertError?.message ?? "Customer could not be created.")}`);
  }

  await supabase.from("leads").update({ status: "quoted" }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/quotes/new");
  redirect(
    `/quotes/new?customerId=${customer.id}&message=${encodeURIComponent(
      "Customer created from lead. Add quote line items next.",
    )}`,
  );
}
