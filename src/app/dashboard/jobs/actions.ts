"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteReceiptAttachment,
  uploadReceiptAttachment,
} from "@/lib/receipt-attachments";
import { queueReceiptScan } from "@/lib/receipt-ocr";
import { hasProAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

const jobStatuses = [
  "not_started",
  "in_progress",
  "completed",
  "cancelled",
] as const;
const costTypes = ["receipt", "supplier_invoice"] as const;
const purchaseTypes = ["product", "service"] as const;
const receiptCategories = [
  "materials",
  "labour",
  "subcontractor",
  "hire",
  "fuel",
  "tools",
  "waste",
  "parking",
  "admin",
  "other",
] as const;

type JobStatus = (typeof jobStatuses)[number];
type CostType = (typeof costTypes)[number];
type PurchaseType = (typeof purchaseTypes)[number];
type ReceiptCategory = (typeof receiptCategories)[number];

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

function isCostType(value: string): value is CostType {
  return costTypes.includes(value as CostType);
}

function isPurchaseType(value: string): value is PurchaseType {
  return purchaseTypes.includes(value as PurchaseType);
}

function isReceiptCategory(value: string): value is ReceiptCategory {
  return receiptCategories.includes(value as ReceiptCategory);
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(getString(formData, key));

  return Number.isFinite(value) ? value : fallback;
}

function money(value: number) {
  return Number(value.toFixed(2));
}

function canAutoScan(attachmentUrl?: string | null) {
  return Boolean(
    attachmentUrl &&
      !/^https?:\/\//i.test(attachmentUrl) &&
      /\.(jpe?g|png|webp|gif|pdf)$/i.test(attachmentUrl),
  );
}

function completedAtFor(status: JobStatus, existingCompletedAt?: string | null) {
  if (status === "completed") {
    return existingCompletedAt ?? new Date().toISOString();
  }

  return null;
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

export async function createJob(formData: FormData) {
  const { supabase, user } = await requireUser();
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
    job_type: optionalString(formData, "job_type"),
    hours_worked: Math.max(getNumber(formData, "hours_worked"), 0),
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
  const { supabase, user } = await requireUser();
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
      job_type: optionalString(formData, "job_type"),
      hours_worked: Math.max(getNumber(formData, "hours_worked"), 0),
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
  const { supabase, user } = await requireUser();
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
  const { supabase, user } = await requireUser();
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

export async function createJobCost(formData: FormData) {
  const { supabase, user } = await requireUser();
  const jobId = getString(formData, "job_id");
  const description = getString(formData, "description");
  const costTypeValue = getString(formData, "cost_type") || "receipt";
  const purchaseTypeValue = getString(formData, "purchase_type") || "product";
  const categoryValue = getString(formData, "category") || "other";
  const quantity = Math.max(getNumber(formData, "quantity", 1), 0);
  const unitCost = Math.max(getNumber(formData, "unit_cost"), 0);
  const vatRate = Math.max(getNumber(formData, "vat_rate"), 0);
  const subtotal = money(quantity * unitCost);
  const vatAmount = money(subtotal * (vatRate / 100));
  const total = money(subtotal + vatAmount);

  if (costTypeValue === "supplier_invoice") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, subscription_status, trial_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!hasProAccess(profile)) {
      redirect(
        "/pricing?message=Supplier invoices are available on Tradio Pro and Elite.",
      );
    }
  }

  if (
    !jobId ||
    !description ||
    quantity <= 0 ||
    !isCostType(costTypeValue) ||
    !isPurchaseType(purchaseTypeValue) ||
    !isReceiptCategory(categoryValue)
  ) {
    redirect(
      `/dashboard/jobs?message=${encodeURIComponent(
        "Add a valid receipt or supplier invoice cost.",
      )}`,
    );
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!job) {
    redirect(`/dashboard/jobs?message=${encodeURIComponent("Job not found.")}`);
  }

  let attachmentUrl = optionalString(formData, "attachment_url");

  try {
    attachmentUrl =
      (await uploadReceiptAttachment({ formData, supabase, userId: user.id })) ??
      attachmentUrl;
  } catch (error) {
    redirect(
      `/dashboard/jobs?message=${encodeURIComponent(
        error instanceof Error ? error.message : "Receipt upload failed.",
      )}`,
    );
  }

  const { data: cost, error } = await supabase.from("job_costs").insert({
    attachment_url: attachmentUrl,
    category: categoryValue,
    cost_type: costTypeValue,
    description,
    document_reference: optionalString(formData, "document_reference"),
    job_id: jobId,
    notes: optionalString(formData, "notes"),
    purchase_date:
      optionalString(formData, "purchase_date") ?? new Date().toISOString().slice(0, 10),
    purchase_type: purchaseTypeValue,
    quantity,
    subtotal,
    supplier_name: optionalString(formData, "supplier_name"),
    total,
    unit_cost: unitCost,
    user_id: user.id,
    vat_amount: vatAmount,
    vat_rate: vatRate,
  })
    .select("id")
    .single();

  if (error) {
    redirect(`/dashboard/jobs?message=${encodeURIComponent(error.message)}`);
  }

  if (cost?.id && canAutoScan(attachmentUrl)) {
    queueReceiptScan({ receiptId: cost.id, supabase, userId: user.id });
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/reports");
  redirect(`/dashboard/jobs?message=${encodeURIComponent("Job cost added")}`);
}

export async function deleteJobCost(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect(`/dashboard/jobs?message=${encodeURIComponent("Job cost not found")}`);
  }

  const { data: jobCost } = await supabase
    .from("job_costs")
    .select("attachment_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("job_costs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/dashboard/jobs?message=${encodeURIComponent(error.message)}`);
  }

  await deleteReceiptAttachment(supabase, jobCost?.attachment_url);

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/reports");
  redirect(`/dashboard/jobs?message=${encodeURIComponent("Job cost deleted")}`);
}
