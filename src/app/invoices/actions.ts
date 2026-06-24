"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendInvoiceReminder } from "@/lib/invoice-reminders";
import { createClient } from "@/lib/supabase/server";

const invoiceStatuses = ["unpaid", "paid", "overdue"] as const;

type InvoiceStatus = (typeof invoiceStatuses)[number];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isInvoiceStatus(value: string): value is InvoiceStatus {
  return invoiceStatuses.includes(value as InvoiceStatus);
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

export async function updateInvoiceStatus(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");
  const status = getString(formData, "status");

  if (!id) {
    redirect(`/invoices?message=${encodeURIComponent("Invoice not found")}`);
  }

  if (!isInvoiceStatus(status)) {
    redirect(`/invoices?message=${encodeURIComponent("Choose a valid status")}`);
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/invoices?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices?message=${encodeURIComponent("Invoice status updated")}`);
}

export async function sendInvoiceReminderAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect(`/invoices?message=${encodeURIComponent("Invoice not found")}`);
  }

  try {
    await sendInvoiceReminder({
      invoiceId: id,
      reminderType: "manual",
      supabase,
      userId: user.id,
    });
  } catch (error) {
    redirect(
      `/invoices?message=${encodeURIComponent(
        error instanceof Error ? error.message : "Reminder could not be sent.",
      )}`,
    );
  }

  revalidatePath("/invoices");
  redirect(`/invoices?message=${encodeURIComponent("Invoice reminder sent")}`);
}
