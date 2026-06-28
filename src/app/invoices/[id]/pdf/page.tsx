import { notFound, redirect } from "next/navigation";
import { emailInvoiceWithPdf } from "@/app/documents/actions";
import { DocumentTemplate } from "@/components/document-template";
import { PrintActions } from "@/components/print-actions";
import { hasProAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

type InvoicePdfPageProps = {
  params: {
    id: string;
  };
};

type DocumentCustomer = {
  address_line_1?: string | null;
  address_line_2?: string | null;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  postcode?: string | null;
  town?: string | null;
};

function singleCustomer(
  customer: DocumentCustomer | DocumentCustomer[] | null,
) {
  return Array.isArray(customer) ? customer[0] ?? null : customer;
}

export default async function InvoicePdfPage({ params }: InvoicePdfPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: accessProfile } = await supabase
    .from("profiles")
    .select("plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!hasProAccess(accessProfile)) {
    redirect("/pricing?message=PDF exports are available on Tradio Pro and Elite.");
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, issue_date, due_date, subtotal, vat_rate, vat_amount, total, notes, customers(name, email, phone, address_line_1, address_line_2, town, postcode)",
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("description, quantity, unit_price, line_total, sort_order")
    .eq("invoice_id", invoice.id)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (itemsError || !items) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "business_name, trade, phone, logo_url, business_address_line_1, business_address_line_2, business_town, business_postcode, vat_number",
    )
    .eq("id", user.id)
    .maybeSingle();

  const customer = singleCustomer(invoice.customers);

  return (
    <div className="min-h-screen bg-mist print:bg-white">
      <PrintActions
        backHref="/invoices"
        documentId={invoice.id}
        emailDisabled={!customer?.email}
        sendAction={emailInvoiceWithPdf}
      />
      <DocumentTemplate
        customer={customer}
        documentLabel="Invoice"
        documentNumber={invoice.invoice_number}
        dueDate={invoice.due_date}
        issueDate={invoice.issue_date}
        items={items}
        notes={invoice.notes}
        profile={profile}
        status={invoice.status}
        subtotal={invoice.subtotal}
        total={invoice.total}
        vatAmount={invoice.vat_amount}
        vatRate={invoice.vat_rate}
      />
    </div>
  );
}
