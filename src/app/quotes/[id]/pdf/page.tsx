import { notFound, redirect } from "next/navigation";
import { emailQuoteWithPdf } from "@/app/documents/actions";
import { DocumentTemplate } from "@/components/document-template";
import { PrintActions } from "@/components/print-actions";
import { hasProAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

type QuotePdfPageProps = {
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

export default async function QuotePdfPage({ params }: QuotePdfPageProps) {
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

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      "id, quote_number, status, issue_date, expiry_date, subtotal, vat_rate, vat_amount, total, notes, customers(name, email, phone, address_line_1, address_line_2, town, postcode)",
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !quote) {
    notFound();
  }

  const { data: items, error: itemsError } = await supabase
    .from("quote_items")
    .select("description, quantity, unit_price, line_total, sort_order")
    .eq("quote_id", quote.id)
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

  const customer = singleCustomer(quote.customers);

  return (
    <div className="min-h-screen bg-mist print:bg-white">
      <PrintActions
        backHref="/quotes"
        documentId={quote.id}
        emailDisabled={!customer?.email}
        sendAction={emailQuoteWithPdf}
      />
      <DocumentTemplate
        customer={customer}
        documentLabel="Quote"
        documentNumber={quote.quote_number}
        dueDate={quote.expiry_date}
        issueDate={quote.issue_date}
        items={items}
        notes={quote.notes}
        profile={profile}
        status={quote.status}
        subtotal={quote.subtotal}
        total={quote.total}
        vatAmount={quote.vat_amount}
        vatRate={quote.vat_rate}
      />
    </div>
  );
}
