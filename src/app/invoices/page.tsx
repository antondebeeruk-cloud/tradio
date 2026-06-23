import Link from "next/link";
import { Check, Mail, Printer, ReceiptText } from "lucide-react";
import { redirect } from "next/navigation";
import { emailInvoiceWithPdf } from "@/app/documents/actions";
import { updateInvoiceStatus } from "@/app/invoices/actions";
import { AppShell } from "@/components/app-shell";
import { currency } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type InvoicesPageProps = {
  searchParams: {
    message?: string;
  };
};

const statusClasses: Record<string, string> = {
  unpaid: "bg-[#eaf2ff] text-[#265a93]",
  paid: "bg-[#e7f7ef] text-[#177a55]",
  overdue: "bg-[#fff0e7] text-[#d94800]",
};

const statusOptions = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

function singleRelation<T>(relation: T | T[] | null) {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, invoicesResult] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, status, issue_date, due_date, total, customers(name, email), quotes(quote_number)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const firstError = profileResult.error ?? invoicesResult.error;

  if (firstError) {
    redirect(`/dashboard?message=${encodeURIComponent(firstError.message)}`);
  }

  const invoices = invoicesResult.data;

  const statusCounts = {
    unpaid: invoices?.filter((invoice) => invoice.status === "unpaid").length ?? 0,
    paid: invoices?.filter((invoice) => invoice.status === "paid").length ?? 0,
    overdue:
      invoices?.filter((invoice) => invoice.status === "overdue").length ?? 0,
  };

  return (
    <AppShell active="invoices" plan={profileResult.data?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Invoices</p>
          <h1 className="page-title">
            Invoices created from accepted quotes.
          </h1>
        </div>
      </header>

      <div className="app-page-body">
        {searchParams.message ? (
          <p className="notice mb-5">
            {searchParams.message}
          </p>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {statusOptions.map((status) => (
            <article
              className="surface-pad"
              key={status.value}
            >
              <p className="text-sm font-medium text-slate-500">
                {status.label}
              </p>
              <p className="mt-3 text-2xl font-semibold text-ink">
                {statusCounts[status.value as keyof typeof statusCounts]}
              </p>
            </article>
          ))}
        </div>

        {invoices && invoices.length > 0 ? (
          <section className="surface overflow-hidden">
            <div className="border-b border-field px-5 py-4">
              <h2 className="text-base font-semibold">Invoice list</h2>
              <p className="mt-1 text-sm text-slate-500">
                {invoices.length} saved invoice
                {invoices.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="divide-y divide-field">
              {invoices.map((invoice) => {
                const customer = singleRelation(invoice.customers);
                const sourceQuote = singleRelation(invoice.quotes);

                return (
                  <article
                    className="grid gap-4 px-5 py-4 xl:grid-cols-[1fr_auto_300px] xl:items-center"
                    key={invoice.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold">
                          {invoice.invoice_number}
                        </h3>
                        <span
                          className={`status-pill ${
                            statusClasses[invoice.status] ?? statusClasses.unpaid
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {customer?.name ?? "Customer removed"} - From{" "}
                        {sourceQuote?.quote_number ?? "manual invoice"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Issued {invoice.issue_date}
                        {invoice.due_date ? ` - Due ${invoice.due_date}` : ""}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-sm text-slate-500">Total</p>
                      <p className="mt-1 text-lg font-semibold">
                        {currency(invoice.total)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <form
                        action={updateInvoiceStatus}
                        className="flex flex-col gap-2 sm:flex-row"
                      >
                        <input name="id" type="hidden" value={invoice.id} />
                        <select
                          className="field-control mt-0"
                          defaultValue={invoice.status}
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

                      <div className="grid gap-2 sm:grid-cols-2">
                        <Link
                          className="btn-secondary"
                          href={`/invoices/${invoice.id}/pdf`}
                        >
                          <Printer aria-hidden="true" size={16} />
                          PDF
                        </Link>
                        <form action={emailInvoiceWithPdf}>
                          <input name="id" type="hidden" value={invoice.id} />
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
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="empty-state">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-field text-forest">
              <ReceiptText aria-hidden="true" size={24} />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No invoices yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Accept a quote, then convert it to create the first invoice.
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
