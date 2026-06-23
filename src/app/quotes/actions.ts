"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const quoteStatuses = ["draft", "sent", "accepted", "rejected"] as const;

type QuoteStatus = (typeof quoteStatuses)[number];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isQuoteStatus(value: string): value is QuoteStatus {
  return quoteStatuses.includes(value as QuoteStatus);
}

function toMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toPositiveNumber(value: FormDataEntryValue | null, fallback: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function toNonNegativeNumber(value: FormDataEntryValue | null, fallback: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
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

function createQuoteNumber() {
  const year = new Date().getFullYear();
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `Q-${year}-${suffix}`;
}

function createInvoiceNumber() {
  const year = new Date().getFullYear();
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `INV-${year}-${suffix}`;
}

function createDueDate() {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  return dueDate.toISOString().slice(0, 10);
}

export async function createQuote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const customerId = getString(formData, "customer_id");
  const vatRate = toNonNegativeNumber(formData.get("vat_rate"), 20);
  const notes = getString(formData, "notes");

  if (!customerId) {
    redirect(
      `/quotes/new?message=${encodeURIComponent("Choose a customer first")}`,
    );
  }

  const descriptions = formData.getAll("item_description");
  const quantities = formData.getAll("item_quantity");
  const unitPrices = formData.getAll("item_unit_price");

  const items = descriptions
    .map((descriptionValue, index) => {
      const description =
        typeof descriptionValue === "string" ? descriptionValue.trim() : "";
      const quantity = toPositiveNumber(quantities[index], 1);
      const unitPrice = toNonNegativeNumber(unitPrices[index], 0);
      const lineTotal = toMoney(quantity * unitPrice);

      return {
        description,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        sort_order: index,
      };
    })
    .filter((item) => item.description.length > 0);

  if (items.length === 0) {
    redirect(
      `/quotes/new?message=${encodeURIComponent(
        "Add at least one quote item",
      )}`,
    );
  }

  const subtotal = toMoney(
    items.reduce((runningTotal, item) => runningTotal + item.line_total, 0),
  );
  const vatAmount = toMoney(subtotal * (vatRate / 100));
  const total = toMoney(subtotal + vatAmount);

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      user_id: user.id,
      customer_id: customerId,
      quote_number: createQuoteNumber(),
      status: "draft",
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (quoteError || !quote) {
    redirect(
      `/quotes/new?message=${encodeURIComponent(
        quoteError?.message ?? "Quote could not be created",
      )}`,
    );
  }

  const { error: itemsError } = await supabase.from("quote_items").insert(
    items.map((item) => ({
      ...item,
      user_id: user.id,
      quote_id: quote.id,
    })),
  );

  if (itemsError) {
    await supabase
      .from("quotes")
      .delete()
      .eq("id", quote.id)
      .eq("user_id", user.id);

    redirect(
      `/quotes/new?message=${encodeURIComponent(itemsError.message)}`,
    );
  }

  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  redirect(`/quotes?message=${encodeURIComponent("Quote created")}`);
}

export async function updateQuoteStatus(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");
  const status = getString(formData, "status");

  if (!id) {
    redirect(`/quotes?message=${encodeURIComponent("Quote not found")}`);
  }

  if (!isQuoteStatus(status)) {
    redirect(`/quotes?message=${encodeURIComponent("Choose a valid status")}`);
  }

  const { error } = await supabase
    .from("quotes")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/quotes?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  redirect(`/quotes?message=${encodeURIComponent("Quote status updated")}`);
}

export async function convertQuoteToInvoice(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect(`/quotes?message=${encodeURIComponent("Quote not found")}`);
  }

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select(
      "id, customer_id, quote_number, status, subtotal, vat_rate, vat_amount, total, notes",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (quoteError || !quote) {
    redirect(`/quotes?message=${encodeURIComponent("Quote not found")}`);
  }

  if (quote.status !== "accepted") {
    redirect(
      `/quotes?message=${encodeURIComponent(
        "Only accepted quotes can be converted to invoices",
      )}`,
    );
  }

  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("quote_id", quote.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingInvoice) {
    redirect(
      `/invoices?message=${encodeURIComponent(
        "This quote has already been converted",
      )}`,
    );
  }

  const { data: quoteItems, error: quoteItemsError } = await supabase
    .from("quote_items")
    .select("description, quantity, unit_price, line_total, sort_order")
    .eq("quote_id", quote.id)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (quoteItemsError || !quoteItems || quoteItems.length === 0) {
    redirect(
      `/quotes?message=${encodeURIComponent(
        "Quote items could not be copied to an invoice",
      )}`,
    );
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      invoice_number: createInvoiceNumber(),
      status: "unpaid",
      due_date: createDueDate(),
      subtotal: quote.subtotal,
      vat_rate: quote.vat_rate,
      vat_amount: quote.vat_amount,
      total: quote.total,
      notes: quote.notes
        ? `Created from quote ${quote.quote_number}.\n\n${quote.notes}`
        : `Created from quote ${quote.quote_number}.`,
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    redirect(
      `/quotes?message=${encodeURIComponent(
        invoiceError?.message ?? "Invoice could not be created",
      )}`,
    );
  }

  const { error: invoiceItemsError } = await supabase
    .from("invoice_items")
    .insert(
      quoteItems.map((item) => ({
        user_id: user.id,
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        sort_order: item.sort_order,
      })),
    );

  if (invoiceItemsError) {
    await supabase
      .from("invoices")
      .delete()
      .eq("id", invoice.id)
      .eq("user_id", user.id);

    redirect(`/quotes?message=${encodeURIComponent(invoiceItemsError.message)}`);
  }

  revalidatePath("/quotes");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices?message=${encodeURIComponent("Invoice created")}`);
}
