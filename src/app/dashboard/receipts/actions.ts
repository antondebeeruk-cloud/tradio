"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteReceiptAttachment,
  uploadReceiptAttachment,
} from "@/lib/receipt-attachments";
import { queueReceiptScan } from "@/lib/receipt-ocr";
import { createClient } from "@/lib/supabase/server";

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

function hasAttachmentInput(formData: FormData) {
  const file = formData.get("receipt_file");

  return (
    Boolean(optionalString(formData, "attachment_url")) ||
    (file instanceof File && file.size > 0)
  );
}

function canAutoScan(attachmentUrl?: string | null) {
  return Boolean(
    attachmentUrl &&
      !/^https?:\/\//i.test(attachmentUrl) &&
      /\.(jpe?g|png|webp|gif|pdf)$/i.test(attachmentUrl),
  );
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

function isReceiptCategory(value: string): value is ReceiptCategory {
  return receiptCategories.includes(value as ReceiptCategory);
}

function money(value: number) {
  return Number(value.toFixed(2));
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

export async function createReceipt(formData: FormData) {
  const { supabase, user } = await requireUser();
  const description =
    getString(formData, "description") ||
    (hasAttachmentInput(formData) ? "Uploaded receipt" : "");
  const jobId = optionalString(formData, "job_id");
  const costTypeValue = getString(formData, "cost_type") || "receipt";
  const purchaseTypeValue = getString(formData, "purchase_type") || "product";
  const categoryValue = getString(formData, "category") || "other";
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
    !isPurchaseType(purchaseTypeValue) ||
    !isReceiptCategory(categoryValue)
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

  const { data: receipt, error } = await supabase
    .from("job_costs")
    .insert({
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
    redirect(`/dashboard/receipts?message=${encodeURIComponent(error.message)}`);
  }

  const shouldAutoScan = receipt?.id && canAutoScan(attachmentUrl);

  if (shouldAutoScan) {
    queueReceiptScan({ receiptId: receipt.id, supabase, userId: user.id });
  }

  revalidatePath("/dashboard/receipts");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/reports");
  redirect(
    `/dashboard/receipts?message=${encodeURIComponent(
      shouldAutoScan
        ? "Receipt saved. Background scan started; refresh shortly to see extracted details."
        : "Receipt saved",
    )}`,
  );
}

export async function scanReceiptFile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect(`/dashboard/receipts?message=${encodeURIComponent("Receipt not found.")}`);
  }

  const { data: receipt, error } = await supabase
    .from("job_costs")
    .select("id, attachment_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !receipt) {
    redirect(
      `/dashboard/receipts?message=${encodeURIComponent(
        error?.message ?? "Receipt not found.",
      )}`,
    );
  }

  if (!receipt.attachment_url || /^https?:\/\//i.test(receipt.attachment_url)) {
    redirect(
      `/dashboard/receipts?message=${encodeURIComponent(
        "Attach an uploaded receipt image before scanning.",
      )}`,
    );
  }

  queueReceiptScan({ receiptId: id, supabase, userId: user.id });

  revalidatePath("/dashboard/receipts");
  redirect(
    `/dashboard/receipts?message=${encodeURIComponent(
      "Receipt scan started. Refresh in a moment to see extracted details.",
    )}`,
  );
}

export async function updateReceiptJob(formData: FormData) {
  const { supabase, user } = await requireUser();
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
  const { supabase, user } = await requireUser();
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
