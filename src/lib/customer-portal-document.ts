import { createAdminClient } from "@/lib/supabase/admin";

type PortalDocumentType = "invoice" | "quote";

type DocumentCustomer = {
  address_line_1?: string | null;
  address_line_2?: string | null;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  postcode?: string | null;
  town?: string | null;
};

type DocumentProfile = {
  business_address_line_1?: string | null;
  business_address_line_2?: string | null;
  business_name?: string | null;
  business_postcode?: string | null;
  business_town?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  trade?: string | null;
  vat_number?: string | null;
};

type DocumentItem = {
  description: string;
  line_total: number | string;
  quantity: number | string;
  sort_order?: number | null;
  unit_price: number | string;
};

type CustomerPortalDocument = {
  customer: DocumentCustomer | null;
  documentId: string;
  documentLabel: "Invoice" | "Quote";
  documentNumber: string;
  documentType: PortalDocumentType;
  dueDate?: string | null;
  issueDate: string | null;
  items: DocumentItem[];
  linkId: string;
  notes?: string | null;
  profile: DocumentProfile | null;
  status: string;
  subtotal: number | null;
  token: string;
  total: number | null;
  userId: string;
  vatAmount: number | null;
  vatRate: number | null;
};

function singleRelation<T>(relation: T | T[] | null) {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export async function getCustomerPortalDocument(
  token: string,
): Promise<CustomerPortalDocument | null> {
  const admin = createAdminClient();
  const { data: link, error: linkError } = await admin
    .from("customer_portal_links")
    .select("id, user_id, document_type, quote_id, invoice_id, token")
    .eq("token", token)
    .maybeSingle();

  if (linkError || !link) {
    return null;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "business_name, trade, phone, logo_url, business_address_line_1, business_address_line_2, business_town, business_postcode, vat_number",
    )
    .eq("id", link.user_id)
    .maybeSingle();

  if (link.document_type === "quote" && link.quote_id) {
    const [{ data: quote }, { data: items }] = await Promise.all([
      admin
        .from("quotes")
        .select(
          "id, user_id, quote_number, status, issue_date, expiry_date, subtotal, vat_rate, vat_amount, total, notes, customers(name, email, phone, address_line_1, address_line_2, town, postcode)",
        )
        .eq("id", link.quote_id)
        .maybeSingle(),
      admin
        .from("quote_items")
        .select("description, quantity, unit_price, line_total, sort_order")
        .eq("quote_id", link.quote_id)
        .order("sort_order", { ascending: true }),
    ]);

    if (!quote || quote.user_id !== link.user_id) {
      return null;
    }

    return {
      customer: singleRelation(quote.customers),
      documentId: quote.id,
      documentLabel: "Quote",
      documentNumber: quote.quote_number,
      documentType: "quote",
      dueDate: quote.expiry_date,
      issueDate: quote.issue_date,
      items: items ?? [],
      linkId: link.id,
      notes: quote.notes,
      profile,
      status: quote.status,
      subtotal: quote.subtotal,
      token: link.token,
      total: quote.total,
      userId: quote.user_id,
      vatAmount: quote.vat_amount,
      vatRate: quote.vat_rate,
    };
  }

  if (link.document_type === "invoice" && link.invoice_id) {
    const [{ data: invoice }, { data: items }] = await Promise.all([
      admin
        .from("invoices")
        .select(
          "id, user_id, invoice_number, status, issue_date, due_date, subtotal, vat_rate, vat_amount, total, notes, customers(name, email, phone, address_line_1, address_line_2, town, postcode)",
        )
        .eq("id", link.invoice_id)
        .maybeSingle(),
      admin
        .from("invoice_items")
        .select("description, quantity, unit_price, line_total, sort_order")
        .eq("invoice_id", link.invoice_id)
        .order("sort_order", { ascending: true }),
    ]);

    if (!invoice || invoice.user_id !== link.user_id) {
      return null;
    }

    return {
      customer: singleRelation(invoice.customers),
      documentId: invoice.id,
      documentLabel: "Invoice",
      documentNumber: invoice.invoice_number,
      documentType: "invoice",
      dueDate: invoice.due_date,
      issueDate: invoice.issue_date,
      items: items ?? [],
      linkId: link.id,
      notes: invoice.notes,
      profile,
      status: invoice.status,
      subtotal: invoice.subtotal,
      token: link.token,
      total: invoice.total,
      userId: invoice.user_id,
      vatAmount: invoice.vat_amount,
      vatRate: invoice.vat_rate,
    };
  }

  return null;
}
