"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteReceiptAttachment,
  uploadReceiptAttachment,
} from "@/lib/receipt-attachments";
import { hasEliteAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

const costTypes = ["receipt", "supplier_invoice"] as const;
const purchaseTypes = ["product", "service"] as const;

type CostType = (typeof costTypes)[number];
type PurchaseType = (typeof purchaseTypes)[number];

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

function getNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(getString(formData, key));

  return Number.isFinite(value) ? value : fallback;
}

function isCostType(value: string): value is CostType {
  return costTypes.includes(value as CostType);
}

function isPurchaseType(value: string): value is PurchaseType {
  return purchaseTypes.includes(value as PurchaseType);
}

function money(value: number) {
  return Number(value.toFixed(2));
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

export async function createReceipt(formData: FormData) {
  const { supabase, user } = await requireEliteUser();
  const description = getString(formData, "description");
  const jobId = optionalString(formData, "job_id");
  const costTypeValue = getString(formData, "cost_type") || "receipt";
  const purchaseTypeValue = getString(formData, "purchase_type") || "product";
  const quantity = Math.max(getNumber(formData, "quantity", 1), 0);
  const unitCost = Math.max(getNumber(formData, "unit_cost"), 0);
  const vatRate = Math.max(getNumber(formData, "vat_rate"), 0);
  const subtotal = money(quantity * unitCost);
  const vatAmount = money(subtotal * (vatRate / 100));
  const total = money(subtotal + vatAmount);

  if (
    !description ||
    quantity <= 0 ||
    !isCostType(costTypeValue) ||
    !isPurchaseType(purchaseTypeValue)
  ) {
    redirect(
      `/dashboard/receipts?message=${encodeURIComponent(
        "Add a valid receipt or supplier invoice.",
      )}`,
    );
  }

  if (jobId) {
    const { data: job } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!job) {
      redirect(`/dashboard/receipts?message=${encodeURIComponent("Job not found.")}`);
    }
  }

  let attachmentUrl = optionalString(formData, "attachment_url");

  try {
    attachmentUrl =
      (await uploadReceiptAttachment({ formData, supabase, userId: user.id })) ??
      attachmentUrl;
  } catch (error) {
    redirect(
      `/dashboard/receipts?message=${encodeURIComponent(
        error instanceof Error ? error.message : "Receipt upload failed.",
      )}`,
    );
  }

  const { error } = await supabase.from("job_costs").insert({
    attachment_url: attachmentUrl,
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
  });

  if (error) {
    redirect(`/dashboard/receipts?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/receipts");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/reports");
  redirect(`/dashboard/receipts?message=${encodeURIComponent("Receipt saved")}`);
}

export async function updateReceiptJob(formData: FormData) {
  const { supabase, user } = await requireEliteUser();
  const id = getString(formData, "id");
  const jobId = optionalString(formData, "job_id");

  if (!id) {
    redirect(`/dashboard/receipts?message=${encodeURIComponent("Receipt not found.")}`);
  }

  if (jobId) {
    const { data: job } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!job) {
      redirect(`/dashboard/receipts?message=${encodeURIComponent("Job not found.")}`);
    }
  }

  const { error } = await supabase
    .from("job_costs")
    .update({
      job_id: jobId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/dashboard/receipts?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/receipts");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/reports");
  redirect(`/dashboard/receipts?message=${encodeURIComponent("Receipt allocation updated")}`);
}

export async function deleteReceipt(formData: FormData) {
  const { supabase, user } = await requireEliteUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect(`/dashboard/receipts?message=${encodeURIComponent("Receipt not found.")}`);
  }

  const { data: receipt } = await supabase
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
    redirect(`/dashboard/receipts?message=${encodeURIComponent(error.message)}`);
  }

  await deleteReceiptAttachment(supabase, receipt?.attachment_url);

  revalidatePath("/dashboard/receipts");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/reports");
  redirect(`/dashboard/receipts?message=${encodeURIComponent("Receipt deleted")}`);
}
