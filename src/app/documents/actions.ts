"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currency } from "@/lib/documents";
import { sendEmailWithPdf } from "@/lib/email";
import { createDocumentPdf } from "@/lib/pdf";
import { hasProAccess } from "@/lib/subscription";

type DocumentCustomer = {
  email: string | null;
  name: string | null;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function singleCustomer(
  customer: DocumentCustomer | DocumentCustomer[] | null,
) {
  return Array.isArray(customer) ? customer[0] ?? null : customer;
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!hasProAccess(profile)) {
    redirect(
      "/pricing?message=PDF exports and PDF email attachments are available on Tradio Pro and Elite.",
    );
  }

  return { supabase, user };
}

async function getBusinessProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select(
      "business_name, trade, phone, business_address_line_1, business_address_line_2, business_town, business_postcode, vat_number",
    )
    .eq("id", userId)
    .maybeSingle();

  return data;
}

export async function emailQuoteWithPdf(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      "id, quote_number, status, issue_date, expiry_date, subtotal, vat_rate, vat_amount, total, customers(name, email)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !quote) {
    redirect(`/quotes?message=${encodeURIComponent("Quote not found")}`);
  }

  const customer = singleCustomer(quote.customers);

  if (!customer?.email) {
    redirect(`/quotes?message=${encodeURIComponent("Customer has no email")}`);
  }

  const { data: items, error: itemsError } = await supabase
    .from("quote_items")
    .select("description, quantity, unit_price, line_total, sort_order")
    .eq("quote_id", quote.id)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (itemsError || !items) {
    redirect(`/quotes?message=${encodeURIComponent("Quote items not found")}`);
  }

  const businessProfile = await getBusinessProfile(supabase, user.id);

  const pdf = createDocumentPdf({
    businessProfile,
    customerName: customer.name ?? "Customer",
    documentLabel: "Quote",
    documentNumber: quote.quote_number,
    dueDate: quote.expiry_date,
    issueDate: quote.issue_date,
    items,
    status: quote.status,
    subtotal: quote.subtotal,
    total: quote.total,
    vatAmount: quote.vat_amount,
    vatRate: quote.vat_rate,
  });

  try {
    await sendEmailWithPdf({
      attachment: pdf,
      filename: `${quote.quote_number}.pdf`,
      html: `<p>Hi ${customer.name ?? ""},</p><p>Please find quote ${
        quote.quote_number
      } for ${currency(quote.total)} attached.</p><p>Thanks</p>`,
      subject: `Quote ${quote.quote_number} from Tradio`,
      text: `Hi ${customer.name ?? ""},\n\nPlease find quote ${
        quote.quote_number
      } for ${currency(quote.total)} attached.\n\nThanks`,
      to: customer.email,
    });
  } catch (error) {
    redirect(
      `/quotes?message=${encodeURIComponent(
        error instanceof Error ? error.message : "Email could not be sent",
      )}`,
    );
  }

  redirect(`/quotes?message=${encodeURIComponent("Quote email sent")}`);
}

export async function emailInvoiceWithPdf(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, issue_date, due_date, subtotal, vat_rate, vat_amount, total, customers(name, email)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !invoice) {
    redirect(`/invoices?message=${encodeURIComponent("Invoice not found")}`);
  }

  const customer = singleCustomer(invoice.customers);

  if (!customer?.email) {
    redirect(`/invoices?message=${encodeURIComponent("Customer has no email")}`);
  }

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("description, quantity, unit_price, line_total, sort_order")
    .eq("invoice_id", invoice.id)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (itemsError || !items) {
    redirect(`/invoices?message=${encodeURIComponent("Invoice items not found")}`);
  }

  const businessProfile = await getBusinessProfile(supabase, user.id);

  const pdf = createDocumentPdf({
    businessProfile,
    customerName: customer.name ?? "Customer",
    documentLabel: "Invoice",
    documentNumber: invoice.invoice_number,
    dueDate: invoice.due_date,
    issueDate: invoice.issue_date,
    items,
    status: invoice.status,
    subtotal: invoice.subtotal,
    total: invoice.total,
    vatAmount: invoice.vat_amount,
    vatRate: invoice.vat_rate,
  });

  try {
    await sendEmailWithPdf({
      attachment: pdf,
      filename: `${invoice.invoice_number}.pdf`,
      html: `<p>Hi ${customer.name ?? ""},</p><p>Please find invoice ${
        invoice.invoice_number
      } for ${currency(invoice.total)} attached.</p><p>Thanks</p>`,
      subject: `Invoice ${invoice.invoice_number} from Tradio`,
      text: `Hi ${customer.name ?? ""},\n\nPlease find invoice ${
        invoice.invoice_number
      } for ${currency(invoice.total)} attached.\n\nThanks`,
      to: customer.email,
    });
  } catch (error) {
    redirect(
      `/invoices?message=${encodeURIComponent(
        error instanceof Error ? error.message : "Email could not be sent",
      )}`,
    );
  }

  redirect(`/invoices?message=${encodeURIComponent("Invoice email sent")}`);
}
