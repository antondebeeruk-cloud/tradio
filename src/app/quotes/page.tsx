import Link from "next/link";
import {
  Check,
  ExternalLink,
  FileText,
  Mail,
  Plus,
  Printer,
  ReceiptText,
} from "lucide-react";
import { redirect } from "next/navigation";
import { emailQuoteWithPdf } from "@/app/documents/actions";
import {
  convertQuoteToInvoice,
  updateQuoteStatus,
} from "@/app/quotes/actions";
import { AppShell } from "@/components/app-shell";
import { CopyButton } from "@/components/copy-button";
import { ensureCustomerPortalLink } from "@/lib/customer-portal";
import { currency } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type QuotesPageProps = {
  searchParams: {
    message?: string;
  };
};

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

const statusClasses: Record<string, string> = {
  draft: "bg-field text-forest",
  sent: "bg-[#eaf2ff] text-[#265a93]",
  accepted: "bg-[#e7f7ef] text-[#177a55]",
  rejected: "bg-[#fff0e7] text-[#d94800]",
};

function singleRelation<T>(relation: T | T[] | null) {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, quotesResult] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
    supabase
      .from("quotes")
      .select(
        "id, quote_number, status, issue_date, expiry_date, subtotal, vat_amount, total, customers(name, email)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const firstError = profileResult.error ?? quotesResult.error;

  if (firstError) {
    redirect(`/dashboard?message=${encodeURIComponent(firstError.message)}`);
  }

  const quotes = quotesResult.data;
  const quotesWithPortalLinks = await Promise.all(
    (quotes ?? []).map(async (quote) => {
      const customer = singleRelation(quote.customers);
      const portalLink = await ensureCustomerPortalLink({
        customerEmail: customer?.email,
        documentId: quote.id,
        documentType: "quote",
        userId: user.id,
      });

      return { ...quote, portalLink };
    }),
  );
  const portalError = quotesWithPortalLinks.find(
    (quote) => quote.portalLink.error,
  )?.portalLink.error;

  return (
    <AppShell active="quotes" plan={profileResult.data?.plan}>
      <header className="app-page-header">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Quotes</p>
            <h1 className="page-title">
              Build professional quotes from saved customer details.
            </h1>
          </div>
          <Link
            className="btn-accent"
            href="/quotes/new"
          >
            <Plus aria-hidden="true" size={17} />
            New quote
          </Link>
        </div>
      </header>

      <div className="app-page-body">
        {searchParams.message ? (
          <p className="notice mb-5">
            {searchParams.message}
          </p>
        ) : null}
        {portalError ? <p className="notice mb-5">{portalError}</p> : null}

        {quotesWithPortalLinks.length > 0 ? (
          <section className="surface overflow-hidden">
            <div className="border-b border-field px-5 py-4">
              <h2 className="text-base font-semibold">Quote list</h2>
              <p className="mt-1 text-sm text-slate-500">
                {quotesWithPortalLinks.length} saved quote
                {quotesWithPortalLinks.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="divide-y divide-field">
              {quotesWithPortalLinks.map((quote) => {
                const customer = singleRelation(quote.customers);

                return (
                  <article
                    className="grid gap-4 px-5 py-4 xl:grid-cols-[1fr_auto_300px] xl:items-center"
                    key={quote.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold">{quote.quote_number}</h3>
                        <span
                          className={`status-pill ${
                            statusClasses[quote.status] ?? statusClasses.draft
                          }`}
                        >
                          {quote.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {customer?.name ?? "Customer removed"} - Issued{" "}
                        {quote.issue_date}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm md:min-w-80">
                      <div>
                        <p className="text-slate-500">Subtotal</p>
                        <p className="mt-1 font-semibold">
                          {currency(quote.subtotal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">VAT</p>
                        <p className="mt-1 font-semibold">
                          {currency(quote.vat_amount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500">Total</p>
                        <p className="mt-1 font-semibold">
                          {currency(quote.total)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <form
                        action={updateQuoteStatus}
                        className="flex flex-col gap-2 sm:flex-row"
                      >
                        <input name="id" type="hidden" value={quote.id} />
                        <select
                          className="field-control mt-0"
                          defaultValue={quote.status}
                          name="status"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button className="btn-secondary">
                          <Check aria-hidden="true" size={16} />
                          Save
                        </button>
                      </form>

                      {quote.portalLink.url ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Link
                            className="btn-secondary"
                            href={quote.portalLink.url}
                            target="_blank"
                          >
                            <ExternalLink aria-hidden="true" size={16} />
                            Portal
                          </Link>
                          <CopyButton text={quote.portalLink.url} />
                        </div>
                      ) : null}

                      <div className="grid gap-2 sm:grid-cols-2">
                        <Link
                          className="btn-secondary"
                          href={`/quotes/${quote.id}/pdf`}
                        >
                          <Printer aria-hidden="true" size={16} />
                          PDF
                        </Link>
                        <form action={emailQuoteWithPdf}>
                          <input name="id" type="hidden" value={quote.id} />
                          <button
                            className={`btn-secondary w-full ${
                              customer?.email
                                ? ""
                                : "cursor-not-allowed bg-slate-100 text-slate-400"
                            }`}
                            disabled={!customer?.email}
                          >
                            <Mail aria-hidden="true" size={16} />
                            Email
                          </button>
                        </form>
                      </div>

                      {quote.status === "accepted" ? (
                        <form action={convertQuoteToInvoice}>
                          <input name="id" type="hidden" value={quote.id} />
                          <button className="btn-primary w-full">
                            <ReceiptText aria-hidden="true" size={16} />
                            Convert to invoice
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="empty-state">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-field text-forest">
              <FileText aria-hidden="true" size={24} />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No quotes yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create your first quote by choosing a customer, adding line items,
              and checking the totals before saving.
            </p>
            <Link
              className="btn-accent mt-5"
              href="/quotes/new"
            >
              <Plus aria-hidden="true" size={17} />
              New quote
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  );
}
