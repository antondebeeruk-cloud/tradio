"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasEliteAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

const jobStatuses = [
  "not_started",
  "in_progress",
  "completed",
  "cancelled",
] as const;

type JobStatus = (typeof jobStatuses)[number];

const upgradeMessage =
  "Reports and Job Tracking are available on Tradio Elite. Upgrade to unlock these features.";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

function isJobStatus(value: string): value is JobStatus {
  return jobStatuses.includes(value as JobStatus);
}

function completedAtFor(status: JobStatus, existingCompletedAt?: string | null) {
  if (status === "completed") {
    return existingCompletedAt ?? new Date().toISOString();
  }

  return null;
}

async function requireEliteUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, role, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!hasEliteAccess(profile)) {
    redirect(`/pricing?message=${encodeURIComponent(upgradeMessage)}`);
  }

  return { supabase, user };
}

export async function createJob(formData: FormData) {
  const { supabase, user } = await requireEliteUser();
  const title = getString(formData, "title");
  const customerId = getString(formData, "customer_id");
  const statusValue = getString(formData, "status") || "not_started";

  if (!title || !customerId) {
    redirect(
      `/dashboard/jobs?message=${encodeURIComponent(
        "Choose a customer and add a job title.",
      )}`,
    );
  }

  if (!isJobStatus(statusValue)) {
    redirect(`/dashboard/jobs?message=${encodeURIComponent("Invalid job status.")}`);
  }

  const { error } = await supabase.from("jobs").insert({
    user_id: user.id,
    customer_id: customerId,
    title,
    description: optionalString(formData, "description"),
    status: statusValue,
    start_date: optionalString(formData, "start_date"),
    due_date: optionalString(formData, "due_date"),
    completed_at: completedAtFor(statusValue),
    related_quote_id: optionalString(formData, "related_quote_id"),
    related_invoice_id: optionalString(formData, "related_invoice_id"),
    notes: optionalString(formData, "notes"),
  });

  if (error) {
    redirect(`/dashboard/jobs?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/jobs");
  redirect(`/dashboard/jobs?message=${encodeURIComponent("Job created")}`);
}

export async function updateJob(formData: FormData) {
  const { supabase, user } = await requireEliteUser();
  const id = getString(formData, "id");
  const title = getString(formData, "title");
  const customerId = getString(formData, "customer_id");
  const statusValue = getString(formData, "status");
  const existingCompletedAt = optionalString(formData, "completed_at");

  if (!id || !title || !customerId || !isJobStatus(statusValue)) {
    redirect(`/dashboard/jobs?message=${encodeURIComponent("Job could not be updated.")}`);
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      customer_id: customerId,
      title,
      description: optionalString(formData, "description"),
      status: statusValue,
      start_date: optionalString(formData, "start_date"),
      due_date: optionalString(formData, "due_date"),
      completed_at: completedAtFor(statusValue, existingCompletedAt),
      related_quote_id: optionalString(formData, "related_quote_id"),
      related_invoice_id: optionalString(formData, "related_invoice_id"),
      notes: optionalString(formData, "notes"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/dashboard/jobs?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/jobs");
  redirect(`/dashboard/jobs?message=${encodeURIComponent("Job updated")}`);
}

export async function updateJobStatus(formData: FormData) {
  const { supabase, user } = await requireEliteUser();
  const id = getString(formData, "id");
  const statusValue = getString(formData, "status");
  const existingCompletedAt = optionalString(formData, "completed_at");

  if (!id || !isJobStatus(statusValue)) {
    redirect(`/dashboard/jobs?message=${encodeURIComponent("Invalid job status.")}`);
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      status: statusValue,
      completed_at: completedAtFor(statusValue, existingCompletedAt),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/dashboard/jobs?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/jobs");
  redirect(`/dashboard/jobs?message=${encodeURIComponent("Job status updated")}`);
}

export async function deleteJob(formData: FormData) {
  const { supabase, user } = await requireEliteUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect(`/dashboard/jobs?message=${encodeURIComponent("Job not found")}`);
  }

  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/dashboard/jobs?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/jobs");
  redirect(`/dashboard/jobs?message=${encodeURIComponent("Job deleted")}`);
}
