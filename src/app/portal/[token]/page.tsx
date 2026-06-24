import { Check, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { acceptPortalQuote } from "@/app/portal/[token]/actions";
import { DocumentTemplate } from "@/components/document-template";
import { PrintButton } from "@/components/print-button";
import { TradioLogo } from "@/components/tradio-logo";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerPortalDocument } from "@/lib/customer-portal-document";

type PortalPageProps = {
  params: {
    token: string;
  };
  searchParams: {
    message?: string;
  };
};

export default async function CustomerPortalPage({
  params,
  searchParams,
}: PortalPageProps) {
  const portalDocument = await getCustomerPortalDocument(params.token);

  if (!portalDocument) {
    notFound();
  }

  const admin = createAdminClient();
  await admin
    .from("customer_portal_links")
    .update({ last_viewed_at: new Date().toISOString() })
    .eq("id", portalDocument.linkId);

  const isQuote = portalDocument.documentType === "quote";
  const canAcceptQuote = isQuote && portalDocument.status !== "accepted";

  return (
    <main className="min-h-screen bg-mist text-ink">
      <header className="border-b border-field bg-[linear-gradient(135deg,#06233f,#03182d)] px-5 py-4 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TradioLogo />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link className="btn-secondary" href={`/portal/${params.token}/pdf`}>
              <Download aria-hidden="true" size={16} />
              Download PDF
            </Link>
            <PrintButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-6">
        {searchParams.message ? (
          <p className="notice mb-5">{searchParams.message}</p>
        ) : null}

        {isQuote ? (
          <div className="mb-5 rounded-lg border border-field bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="eyebrow">Customer portal</p>
                <h1 className="mt-2 text-2xl font-black">
                  Review your quote from{" "}
                  {portalDocument.profile?.business_name ?? "Tradio"}.
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  You can download the PDF or accept the quote below.
                </p>
              </div>
              {canAcceptQuote ? (
                <form action={acceptPortalQuote}>
                  <input name="token" type="hidden" value={params.token} />
                  <button className="btn-accent">
                    <Check aria-hidden="true" size={17} />
                    Accept quote
                  </button>
                </form>
              ) : (
                <span className="status-pill bg-[#e7f7ef] text-[#177a55]">
                  Accepted
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-5 rounded-lg border border-field bg-white p-5 shadow-sm">
            <p className="eyebrow">Customer portal</p>
            <h1 className="mt-2 text-2xl font-black">
              Review your invoice from{" "}
              {portalDocument.profile?.business_name ?? "Tradio"}.
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Online payments can be added later. For now, customers can view
              and download the invoice PDF.
            </p>
          </div>
        )}
      </section>

      <DocumentTemplate
        customer={portalDocument.customer}
        documentLabel={portalDocument.documentLabel}
        documentNumber={portalDocument.documentNumber}
        dueDate={portalDocument.dueDate}
        issueDate={portalDocument.issueDate}
        items={portalDocument.items}
        notes={portalDocument.notes}
        profile={portalDocument.profile}
        status={portalDocument.status}
        subtotal={portalDocument.subtotal}
        total={portalDocument.total}
        vatAmount={portalDocument.vatAmount}
        vatRate={portalDocument.vatRate}
      />
    </main>
  );
}
