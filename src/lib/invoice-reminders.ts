import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPortalUrl } from "@/lib/customer-portal";
import { currency, formatDate } from "@/lib/documents";
import { sendSmtpEmail } from "@/lib/smtp";
import { createAdminClient } from "@/lib/supabase/admin";

type ReminderType = "automatic" | "manual";

type InvoiceCustomer = {
  email?: string | null;
  name?: string | null;
};

function singleRelation<T>(relation: T | T[] | null) {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function fromAddress() {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  if (!from) {
    throw new Error("Missing EMAIL_FROM or SMTP_USER.");
  }

  return from;
}

function invoiceReminderCopy({
  businessName,
  customerName,
  dueDate,
  invoiceNumber,
  portalUrl,
  total,
}: {
  businessName: string;
  customerName?: string | null;
  dueDate?: string | null;
  invoiceNumber: string;
  portalUrl: string;
  total: number | string | null;
}) {
  const greeting = customerName ? `Hi ${customerName},` : "Hi,";
  const dueLine = dueDate
    ? `This invoice was due on ${formatDate(dueDate)}.`
    : "This invoice is currently unpaid.";

  return {
    html: `<p>${greeting}</p><p>This is a friendly reminder that invoice <strong>${invoiceNumber}</strong> for <strong>${currency(
      Number(total ?? 0),
    )}</strong> from ${businessName} is still unpaid.</p><p>${dueLine}</p><p>You can view and download the invoice here:</p><p><a href="${portalUrl}">${portalUrl}</a></p><p>Thanks,<br>${businessName}</p>`,
    text: `${greeting}\n\nThis is a friendly reminder that invoice ${invoiceNumber} for ${currency(
      Number(total ?? 0),
    )} from ${businessName} is still unpaid.\n\n${dueLine}\n\nView and download the invoice here:\n${portalUrl}\n\nThanks,\n${businessName}`,
  };
}

async function ensureInvoicePortalLink({
  customerEmail,
  invoiceId,
  supabase,
  userId,
}: {
  customerEmail?: string | null;
  invoiceId: string;
  supabase: SupabaseClient;
  userId: string;
}) {
  const { data: existingLink, error: existingError } = await supabase
    .from("customer_portal_links")
    .select("token")
    .eq("document_type", "invoice")
    .eq("invoice_id", invoiceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingLink?.token) {
    return buildPortalUrl(existingLink.token);
  }

  if (existingError) {
    throw new Error(existingError.message);
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  const { data: newLink, error: insertError } = await supabase
    .from("customer_portal_links")
    .insert({
      customer_email: customerEmail || null,
      document_type: "invoice",
      invoice_id: invoiceId,
      token,
      user_id: userId,
    })
    .select("token")
    .single();

  if (insertError || !newLink?.token) {
    throw new Error(insertError?.message ?? "Invoice portal link could not be created.");
  }

  return buildPortalUrl(newLink.token);
}

async function logReminder({
  customerEmail,
  invoiceId,
  message,
  reminderType,
  status,
  supabase,
  userId,
}: {
  customerEmail: string;
  invoiceId: string;
  message?: string;
  reminderType: ReminderType;
  status: "failed" | "sent";
  supabase: SupabaseClient;
  userId: string;
}) {
  await supabase.from("invoice_reminders").insert({
    customer_email: customerEmail,
    invoice_id: invoiceId,
    message: message ?? null,
    reminder_type: reminderType,
    status,
    user_id: userId,
  });
}

export async function sendInvoiceReminder({
  invoiceId,
  reminderType,
  supabase,
  userId,
}: {
  invoiceId: string;
  reminderType: ReminderType;
  supabase: SupabaseClient;
  userId: string;
}) {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "id, user_id, invoice_number, status, due_date, total, customers(name,email)",
    )
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !invoice) {
    throw new Error(error?.message ?? "Invoice not found.");
  }

  if (invoice.status === "paid") {
    throw new Error("This invoice is already marked as paid.");
  }

  const customer = singleRelation<InvoiceCustomer>(invoice.customers);

  if (!customer?.email) {
    throw new Error("Customer has no email address.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name")
    .eq("id", userId)
    .maybeSingle();
  const businessName = profile?.business_name || "Tradio";
  const portalUrl = await ensureInvoicePortalLink({
    customerEmail: customer.email,
    invoiceId,
    supabase,
    userId,
  });
  const copy = invoiceReminderCopy({
    businessName,
    customerName: customer.name,
    dueDate: invoice.due_date,
    invoiceNumber: invoice.invoice_number,
    portalUrl,
    total: invoice.total,
  });

  try {
    await sendSmtpEmail({
      from: fromAddress(),
      html: copy.html,
      subject: `Friendly reminder: invoice ${invoice.invoice_number}`,
      text: copy.text,
      to: customer.email,
    });

    await logReminder({
      customerEmail: customer.email,
      invoiceId,
      reminderType,
      status: "sent",
      supabase,
      userId,
    });
  } catch (sendError) {
    await logReminder({
      customerEmail: customer.email,
      invoiceId,
      message:
        sendError instanceof Error
          ? sendError.message
          : "Reminder email failed.",
      reminderType,
      status: "failed",
      supabase,
      userId,
    });

    throw sendError;
  }
}

export async function sendAutomaticInvoiceReminders() {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: invoices, error } = await admin
    .from("invoices")
    .select("id, user_id, status, due_date, customers(email)")
    .in("status", ["unpaid", "overdue"])
    .lte("due_date", today)
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const invoice of invoices ?? []) {
    const customer = singleRelation<InvoiceCustomer>(invoice.customers);

    if (!customer?.email) {
      skipped += 1;
      continue;
    }

    const { data: recentReminder } = await admin
      .from("invoice_reminders")
      .select("id")
      .eq("invoice_id", invoice.id)
      .eq("status", "sent")
      .gte("sent_at", sevenDaysAgo.toISOString())
      .maybeSingle();

    if (recentReminder) {
      skipped += 1;
      continue;
    }

    try {
      await sendInvoiceReminder({
        invoiceId: invoice.id,
        reminderType: "automatic",
        supabase: admin,
        userId: invoice.user_id,
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    failed,
    inspected: invoices?.length ?? 0,
    sent,
    skipped,
  };
}
