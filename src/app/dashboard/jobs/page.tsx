import {
  BriefcaseBusiness,
  Check,
  Download,
  LinkIcon,
  Plus,
  ReceiptText,
  Save,
  Trash2,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  createJobCost,
  createJob,
  deleteJobCost,
  deleteJob,
  updateJob,
  updateJobStatus,
} from "@/app/dashboard/jobs/actions";
import { AppShell } from "@/components/app-shell";
import { ReceiptCapture } from "@/components/receipt-capture";
import { currency, formatDate } from "@/lib/documents";
import {
  signedReceiptDownloadUrl,
  signedReceiptUrl,
} from "@/lib/receipt-attachments";
import { createClient } from "@/lib/supabase/server";

type JobsPageProps = {
  searchParams: {
    message?: string;
  };
};

type RelationWithName =
  | { name?: string | null }
  | { quote_number?: string | null; total?: number | string | null }
  | { invoice_number?: string | null; total?: number | string | null };

const jobStatusOptions = [
  { label: "Not started", value: "not_started" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const jobStatusClasses: Record<string, string> = {
  cancelled: "bg-[#fff0e7] text-[#d94800]",
  completed: "bg-[#e7f7ef] text-[#177a55]",
  in_progress: "bg-[#eaf2ff] text-[#265a93]",
  not_started: "bg-field text-forest",
};

const costTypeLabels: Record<string, string> = {
  receipt: "Receipt",
  supplier_invoice: "Supplier invoice",
};

const purchaseTypeLabels: Record<string, string> = {
  product: "Product",
  service: "Service",
};

const categoryLabels: Record<string, string> = {
  admin: "Admin",
  fuel: "Fuel",
  hire: "Hire",
  labour: "Labour",
  materials: "Materials",
  other: "Other",
  parking: "Parking",
  subcontractor: "Subcontractor",
  tools: "Tools",
  waste: "Waste",
};

function singleRelation<T>(relation: T | T[] | null) {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function relationName(relation: RelationWithName | RelationWithName[] | null) {
  const value = singleRelation(relation);

  if (!value) {
    return "";
  }

  if ("name" in value) {
    return value.name ?? "";
  }

  if ("quote_number" in value) {
    return value.quote_number ?? "";
  }

  if ("invoice_number" in value) {
    return value.invoice_number ?? "";
  }

  return "";
}

function statusLabel(status: string) {
  return (
    jobStatusOptions.find((option) => option.value === status)?.label ?? status
  );
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? number : 0;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const [customersResult, quotesResult, invoicesResult, jobsResult, costsResult] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("quotes")
        .select("id, quote_number, customer_id, total")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("id, invoice_number, customer_id, total")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("jobs")
        .select(
          "id, customer_id, title, job_type, description, status, start_date, due_date, completed_at, related_quote_id, related_invoice_id, notes, created_at, customers(name), quotes(quote_number,total), invoices(invoice_number,total)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("job_costs")
        .select(
          "id, job_id, cost_type, purchase_type, category, supplier_name, document_reference, purchase_date, description, quantity, unit_cost, subtotal, vat_rate, vat_amount, total, attachment_url, notes",
        )
        .eq("user_id", user.id)
        .order("purchase_date", { ascending: false }),
    ]);

  const jobCostsTableMissing =
    costsResult.error?.message.includes("job_costs") ||
    costsResult.error?.message.includes("schema cache");
  const firstError =
    customersResult.error ??
    quotesResult.error ??
    invoicesResult.error ??
    jobsResult.error ??
    (jobCostsTableMissing ? null : costsResult.error);

  if (firstError) {
    redirect(`/dashboard?message=${encodeURIComponent(firstError.message)}`);
  }

  const customers = customersResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const costs = jobCostsTableMissing
    ? []
    : await Promise.all(
        (costsResult.data ?? []).map(async (cost) => ({
          ...cost,
          attachmentDownloadUrl: await signedReceiptDownloadUrl(
            supabase,
            cost.attachment_url,
          ),
          attachmentDisplayUrl: await signedReceiptUrl(supabase, cost.attachment_url),
        })),
      );
  const costsByJob = costs.reduce<Record<string, typeof costs>>((map, cost) => {
    if (!cost.job_id) {
      return map;
    }

    const jobCosts = map[cost.job_id] ?? [];
    jobCosts.push(cost);
    map[cost.job_id] = jobCosts;

    return map;
  }, {});

  return (
    <AppShell active="jobs" plan={profile?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Job tracking</p>
          <h1 className="page-title">
            Track work from first quote to completed job.
          </h1>
        </div>
      </header>

      <div className="app-page-body">
        {searchParams.message ? (
          <p className="notice mb-5">{searchParams.message}</p>
        ) : null}
        {jobCostsTableMissing ? (
          <p className="notice mb-5">
            Job cost tracking needs the latest Supabase SQL. Run
            supabase/job-costs.sql, then refresh this page.
          </p>
        ) : null}

        <section className="surface-pad">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-field text-forest">
              <Plus aria-hidden="true" size={20} />
            </div>
            <div>
              <h2 className="font-semibold">Create job</h2>
              <p className="text-sm text-slate-500">
                Link a job to a customer, quote, or invoice.
              </p>
            </div>
          </div>

          {customers.length > 0 ? (
            <form action={createJob} className="grid gap-5 xl:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="customer_id">
                  Customer
                </label>
                <select className="field-control" id="customer_id" name="customer_id" required>
                  <option value="">Choose customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="title">
                  Job title
                </label>
                <input className="field-control" id="title" name="title" required />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="job_type">
                  Job type
                </label>
                <input
                  className="field-control"
                  id="job_type"
                  name="job_type"
                  placeholder="Bathrooms, Boilers, Leaks, Call-outs..."
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="status">
                  Status
                </label>
                <select className="field-control" id="status" name="status">
                  {jobStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium" htmlFor="start_date">
                    Start date
                  </label>
                  <input className="field-control" id="start_date" name="start_date" type="date" />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="due_date">
                    Due date
                  </label>
                  <input className="field-control" id="due_date" name="due_date" type="date" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="related_quote_id">
                  Related quote
                </label>
                <select className="field-control" id="related_quote_id" name="related_quote_id">
                  <option value="">No quote linked</option>
                  {quotes.map((quote) => (
                    <option key={quote.id} value={quote.id}>
                      {quote.quote_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="related_invoice_id">
                  Related invoice
                </label>
                <select className="field-control" id="related_invoice_id" name="related_invoice_id">
                  <option value="">No invoice linked</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="description">
                  Description
                </label>
                <textarea className="field-control min-h-24" id="description" name="description" />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="notes">
                  Notes
                </label>
                <textarea className="field-control min-h-24" id="notes" name="notes" />
              </div>

              <div className="xl:col-span-2">
                <button className="btn-accent">
                  <Plus aria-hidden="true" size={17} />
                  Create job
                </button>
              </div>
            </form>
          ) : (
            <p className="notice">
              Add a customer before creating your first tracked job.
            </p>
          )}
        </section>

        <section className="surface mt-6 overflow-hidden">
          <div className="section-bar">
            <h2 className="font-semibold">Tracked jobs</h2>
            <p className="mt-1 text-sm text-slate-500">
              {jobs.length} saved job{jobs.length === 1 ? "" : "s"}
            </p>
          </div>

          {jobs.length > 0 ? (
            <div className="divide-y divide-field">
              {jobs.map((job) => {
                const jobCosts = costsByJob[job.id] ?? [];
                const costTotal = jobCosts.reduce(
                  (total, cost) => total + numberValue(cost.total),
                  0,
                );
                const linkedInvoice = singleRelation(job.invoices);
                const linkedQuote = singleRelation(job.quotes);
                const revenue =
                  linkedInvoice && "total" in linkedInvoice
                    ? numberValue(linkedInvoice.total)
                    : linkedQuote && "total" in linkedQuote
                      ? numberValue(linkedQuote.total)
                      : 0;
                const profit = revenue - costTotal;
                const profitClass =
                  profit >= 0 ? "text-[#177a55]" : "text-[#d94800]";

                return (
                <article className="px-5 py-5" key={job.id}>
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold">{job.title}</h3>
                        <span
                          className={`status-pill ${
                            jobStatusClasses[job.status] ??
                            jobStatusClasses.not_started
                          }`}
                        >
                          {statusLabel(job.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {relationName(job.customers) || "Customer removed"}
                        {job.start_date ? ` - Starts ${formatDate(job.start_date)}` : ""}
                        {job.due_date ? ` - Due ${formatDate(job.due_date)}` : ""}
                      </p>
                      {job.description ? (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {job.description}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                        {job.job_type ? (
                          <span className="rounded-lg bg-[#fff0e7] px-2 py-1 text-[#d94800]">
                            Type: {job.job_type}
                          </span>
                        ) : null}
                        {relationName(job.quotes) ? (
                          <span className="rounded-lg bg-field px-2 py-1">
                            Quote: {relationName(job.quotes)}
                          </span>
                        ) : null}
                        {relationName(job.invoices) ? (
                          <span className="rounded-lg bg-field px-2 py-1">
                            Invoice: {relationName(job.invoices)}
                          </span>
                        ) : null}
                        {job.completed_at ? (
                          <span className="rounded-lg bg-[#e7f7ef] px-2 py-1 text-[#177a55]">
                            Completed {formatDate(job.completed_at)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <form action={updateJobStatus} className="flex gap-2">
                      <input name="id" type="hidden" value={job.id} />
                      <input
                        name="completed_at"
                        type="hidden"
                        value={job.completed_at ?? ""}
                      />
                      <select
                        className="field-control mt-0"
                        defaultValue={job.status}
                        name="status"
                      >
                        {jobStatusOptions.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      <button className="btn-secondary">
                        <Check aria-hidden="true" size={16} />
                        Status
                      </button>
                    </form>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-field bg-mist p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        Job income
                      </p>
                      <p className="mt-2 text-xl font-semibold">
                        {currency(revenue)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Uses linked invoice first, then quote.
                      </p>
                    </div>
                    <div className="rounded-lg border border-field bg-mist p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        Purchases
                      </p>
                      <p className="mt-2 text-xl font-semibold">
                        {currency(costTotal)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Receipts and supplier invoices.
                      </p>
                    </div>
                    <div className="rounded-lg border border-field bg-mist p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        Profit / loss
                      </p>
                      <p className={`mt-2 text-xl font-semibold ${profitClass}`}>
                        {currency(profit)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Before overheads and tax adjustments.
                      </p>
                    </div>
                  </div>

                  <details className="mt-5 rounded-lg border border-field bg-white">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                      Receipts and supplier invoices
                    </summary>
                    <div className="border-t border-field p-4">
                      <form
                        action={createJobCost}
                        className="grid gap-4 rounded-lg border border-field bg-mist p-4 xl:grid-cols-3"
                      >
                        <input name="job_id" type="hidden" value={job.id} />
                        <ReceiptCapture />
                        <div>
                          <label className="text-sm font-medium">Document type</label>
                          <select className="field-control" name="cost_type">
                            <option value="receipt">Receipt</option>
                            <option value="supplier_invoice">Supplier invoice</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Purchase type</label>
                          <select className="field-control" name="purchase_type">
                            <option value="product">Product</option>
                            <option value="service">Service</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Category</label>
                          <select className="field-control" name="category">
                            {Object.entries(categoryLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Purchase date</label>
                          <input
                            className="field-control"
                            name="purchase_date"
                            type="date"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Supplier</label>
                          <input
                            className="field-control"
                            name="supplier_name"
                            placeholder="Supplier or merchant"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Reference</label>
                          <input
                            className="field-control"
                            name="document_reference"
                            placeholder="Receipt or invoice number"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Receipt URL</label>
                          <input
                            className="field-control"
                            name="attachment_url"
                            placeholder="https://..."
                            type="url"
                          />
                        </div>
                        <div className="xl:col-span-3">
                          <label className="text-sm font-medium">Description</label>
                          <input
                            className="field-control"
                            name="description"
                            placeholder="Materials, hire, subcontractor, fuel..."
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Quantity</label>
                          <input
                            className="field-control"
                            defaultValue="1"
                            min="0.01"
                            name="quantity"
                            step="0.01"
                            type="number"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Unit cost</label>
                          <input
                            className="field-control"
                            defaultValue="0"
                            min="0"
                            name="unit_cost"
                            step="0.01"
                            type="number"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">VAT rate %</label>
                          <input
                            className="field-control"
                            defaultValue="0"
                            min="0"
                            name="vat_rate"
                            step="0.01"
                            type="number"
                          />
                        </div>
                        <div className="xl:col-span-3">
                          <label className="text-sm font-medium">Notes</label>
                          <textarea className="field-control min-h-20" name="notes" />
                        </div>
                        <div className="xl:col-span-3">
                          <button className="btn-accent">
                            <ReceiptText aria-hidden="true" size={16} />
                            Add cost
                          </button>
                        </div>
                      </form>

                      <div className="mt-4 divide-y divide-field rounded-lg border border-field">
                        {jobCosts.length > 0 ? (
                          jobCosts.map((cost) => (
                            <div
                              className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[1fr_auto] lg:items-center"
                              key={cost.id}
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-ink">
                                    {cost.description}
                                  </p>
                                  <span className="status-pill bg-field text-forest">
                                    {costTypeLabels[cost.cost_type] ?? cost.cost_type}
                                  </span>
                                  <span className="status-pill bg-[#fff5ef] text-[#d94800]">
                                    {purchaseTypeLabels[cost.purchase_type] ??
                                      cost.purchase_type}
                                  </span>
                                  <span className="status-pill bg-field text-forest">
                                    {categoryLabels[cost.category] ??
                                      cost.category ??
                                      "Other"}
                                  </span>
                                </div>
                                <p className="mt-1 text-slate-500">
                                  {cost.supplier_name || "No supplier"}
                                  {cost.document_reference
                                    ? ` - Ref ${cost.document_reference}`
                                    : ""}
                                  {cost.purchase_date
                                    ? ` - ${formatDate(cost.purchase_date)}`
                                    : ""}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Qty {numberValue(cost.quantity).toFixed(2)} x{" "}
                                  {currency(numberValue(cost.unit_cost))} + VAT{" "}
                                  {numberValue(cost.vat_rate).toFixed(2)}%
                                </p>
                                {cost.attachmentDisplayUrl ? (
                                  <div className="mt-1 flex flex-wrap gap-3">
                                    <a
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-copper hover:underline"
                                      href={cost.attachmentDisplayUrl}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      <LinkIcon aria-hidden="true" size={13} />
                                      View file
                                    </a>
                                    <a
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-copper hover:underline"
                                      download
                                      href={cost.attachmentDownloadUrl}
                                    >
                                      <Download aria-hidden="true" size={13} />
                                      Download
                                    </a>
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-3 lg:justify-end">
                                <p className="font-semibold">
                                  {currency(numberValue(cost.total))}
                                </p>
                                <form action={deleteJobCost}>
                                  <input name="id" type="hidden" value={cost.id} />
                                  <button className="btn-secondary" type="submit">
                                    <Trash2 aria-hidden="true" size={15} />
                                    Delete
                                  </button>
                                </form>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="px-4 py-5 text-sm text-slate-500">
                            No receipts or supplier invoices have been added to
                            this job yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </details>

                  <details className="mt-5 rounded-lg border border-field bg-white">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                      Edit job details
                    </summary>
                    <form action={updateJob} className="grid gap-5 border-t border-field p-4 xl:grid-cols-2">
                      <input name="id" type="hidden" value={job.id} />
                      <input
                        name="completed_at"
                        type="hidden"
                        value={job.completed_at ?? ""}
                      />

                      <div>
                        <label className="text-sm font-medium">Customer</label>
                        <select
                          className="field-control"
                          defaultValue={job.customer_id}
                          name="customer_id"
                          required
                        >
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Title</label>
                        <input
                          className="field-control"
                          defaultValue={job.title}
                          name="title"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Job type</label>
                        <input
                          className="field-control"
                          defaultValue={job.job_type ?? ""}
                          name="job_type"
                          placeholder="Bathrooms, Boilers, Leaks, Call-outs..."
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <select
                          className="field-control"
                          defaultValue={job.status}
                          name="status"
                        >
                          {jobStatusOptions.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Start date</label>
                          <input
                            className="field-control"
                            defaultValue={job.start_date ?? ""}
                            name="start_date"
                            type="date"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Due date</label>
                          <input
                            className="field-control"
                            defaultValue={job.due_date ?? ""}
                            name="due_date"
                            type="date"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Related quote</label>
                        <select
                          className="field-control"
                          defaultValue={job.related_quote_id ?? ""}
                          name="related_quote_id"
                        >
                          <option value="">No quote linked</option>
                          {quotes.map((quote) => (
                            <option key={quote.id} value={quote.id}>
                              {quote.quote_number}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          Related invoice
                        </label>
                        <select
                          className="field-control"
                          defaultValue={job.related_invoice_id ?? ""}
                          name="related_invoice_id"
                        >
                          <option value="">No invoice linked</option>
                          {invoices.map((invoice) => (
                            <option key={invoice.id} value={invoice.id}>
                              {invoice.invoice_number}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                          className="field-control min-h-24"
                          defaultValue={job.description ?? ""}
                          name="description"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Notes</label>
                        <textarea
                          className="field-control min-h-24"
                          defaultValue={job.notes ?? ""}
                          name="notes"
                        />
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row xl:col-span-2">
                        <button className="btn-primary">
                          <Save aria-hidden="true" size={16} />
                          Save job
                        </button>
                      </div>
                    </form>
                  </details>

                  <form action={deleteJob} className="mt-3">
                    <input name="id" type="hidden" value={job.id} />
                    <button className="btn-secondary text-slate-600 hover:text-ink">
                      <Trash2 aria-hidden="true" size={16} />
                      Delete job
                    </button>
                  </form>
                </article>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-field text-forest">
                <BriefcaseBusiness aria-hidden="true" size={24} />
              </div>
              <h2 className="mt-4 text-lg font-semibold">No jobs yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Create your first job to track work dates, status, notes, and
                linked quotes or invoices.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
