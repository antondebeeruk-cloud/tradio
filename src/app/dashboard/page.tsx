import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  FileText,
  Plus,
  UsersRound,
} from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { currency, formatDate } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

function relationName(relation: unknown) {
  if (!relation) {
    return "Customer removed";
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name ?? "Customer removed";
  }

  if (typeof relation === "object" && "name" in relation) {
    return String(relation.name ?? "Customer removed");
  }

  return "Customer removed";
}

const quoteStatusClasses: Record<string, string> = {
  draft: "bg-field text-forest",
  sent: "bg-[#eaf2ff] text-[#265a93]",
  accepted: "bg-[#e7f7ef] text-[#177a55]",
  rejected: "bg-[#fff0e7] text-[#d94800]",
};

const invoiceStatusClasses: Record<string, string> = {
  unpaid: "bg-[#eaf2ff] text-[#265a93]",
  paid: "bg-[#e7f7ef] text-[#177a55]",
  overdue: "bg-[#fff0e7] text-[#d94800]",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    profileResult,
    customersResult,
    recentQuotesResult,
    recentInvoicesResult,
    unpaidInvoicesResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("quotes")
      .select(
        "id, quote_number, status, issue_date, total, customers(name)",
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, status, issue_date, due_date, total, customers(name)",
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, status, due_date, total, customers(name)",
      )
      .eq("user_id", user.id)
      .in("status", ["unpaid", "overdue"])
      .order("due_date", { ascending: true }),
  ]);

  const firstError =
    profileResult.error ??
    customersResult.error ??
    recentQuotesResult.error ??
    recentInvoicesResult.error ??
    unpaidInvoicesResult.error;

  if (firstError) {
    redirect(`/dashboard?message=${encodeURIComponent(firstError.message)}`);
  }

  const recentQuotes = recentQuotesResult.data ?? [];
  const recentInvoices = recentInvoicesResult.data ?? [];
  const unpaidInvoices = unpaidInvoicesResult.data ?? [];

  const unpaidTotal = unpaidInvoices.reduce(
    (runningTotal, invoice) => runningTotal + Number(invoice.total ?? 0),
    0,
  );

  const stats = [
    {
      label: "Unpaid balance",
      value: currency(unpaidTotal),
      note: `${unpaidInvoices.length} invoice${
        unpaidInvoices.length === 1 ? "" : "s"
      } unpaid or overdue`,
      icon: AlertCircle,
    },
    {
      label: "Quotes",
      value: String(recentQuotesResult.count ?? 0),
      note: "Total saved quotes",
      icon: FileText,
    },
    {
      label: "Customers",
      value: String(customersResult.count ?? 0),
      note: "Saved contacts",
      icon: UsersRound,
    },
  ];

  return (
    <AppShell active="dashboard" plan={profileResult.data?.plan}>
      <header className="app-page-header">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">
              Signed in as {user.email}
            </p>
            <h1 className="page-title">
              Today&apos;s quotes, invoices, and unpaid work.
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
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <article
              className="surface-pad relative overflow-hidden"
              key={stat.label}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff5a00,#06233f)]" />
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#fff1e8] text-copper">
                  <stat.icon aria-hidden="true" size={18} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold text-ink">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-500">{stat.note}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="surface overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-field px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Unpaid invoices</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Includes overdue invoices.
                </p>
              </div>
              <Link
                className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
                href="/invoices"
              >
                View all
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
            <div className="divide-y divide-field">
              {unpaidInvoices.length > 0 ? (
                unpaidInvoices.slice(0, 5).map((invoice) => (
                  <div
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                    key={invoice.id}
                  >
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {relationName(invoice.customers)}
                        {invoice.due_date
                          ? ` - Due ${formatDate(invoice.due_date)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span
                        className={`status-pill ${
                          invoiceStatusClasses[invoice.status] ??
                          invoiceStatusClasses.unpaid
                        }`}
                      >
                        {invoice.status}
                      </span>
                      <span className="min-w-24 text-right text-sm font-semibold">
                        {currency(invoice.total)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-5 py-8 text-sm text-slate-500">
                  No unpaid invoices. Nice and tidy.
                </p>
              )}
            </div>
          </section>

          <section className="surface overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-field px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Recent quotes</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Latest quote activity.
                </p>
              </div>
              <Link
                className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
                href="/quotes"
              >
                View all
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
            <div className="divide-y divide-field">
              {recentQuotes.length > 0 ? (
                recentQuotes.map((quote) => (
                  <div
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                    key={quote.id}
                  >
                    <div>
                      <p className="font-medium">{quote.quote_number}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {relationName(quote.customers)} -{" "}
                        {formatDate(quote.issue_date)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span
                        className={`status-pill ${
                          quoteStatusClasses[quote.status] ??
                          quoteStatusClasses.draft
                        }`}
                      >
                        {quote.status}
                      </span>
                      <span className="min-w-24 text-right text-sm font-semibold">
                        {currency(quote.total)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-5 py-8 text-sm text-slate-500">
                  No quotes yet. Create one to start the workflow.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="surface mt-6 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-field px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Recent invoices</h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest invoices created from accepted quotes.
              </p>
            </div>
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
              href="/invoices"
            >
              View all
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
          <div className="divide-y divide-field">
            {recentInvoices.length > 0 ? (
              recentInvoices.map((invoice) => (
                <div
                  className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto_auto] md:items-center"
                  key={invoice.id}
                >
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {relationName(invoice.customers)} - Issued{" "}
                      {formatDate(invoice.issue_date)}
                      {invoice.due_date
                        ? ` - Due ${formatDate(invoice.due_date)}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`status-pill w-fit ${
                      invoiceStatusClasses[invoice.status] ??
                      invoiceStatusClasses.unpaid
                    }`}
                  >
                    {invoice.status}
                  </span>
                  <span className="text-left text-sm font-semibold md:min-w-24 md:text-right">
                    {currency(invoice.total)}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">
                No invoices yet. Accepted quotes can be converted from the
                Quotes page.
              </p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
