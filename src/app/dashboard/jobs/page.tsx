import { BriefcaseBusiness, Check, Plus, Save, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import {
  createJob,
  deleteJob,
  updateJob,
  updateJobStatus,
} from "@/app/dashboard/jobs/actions";
import { AppShell } from "@/components/app-shell";
import { formatDate } from "@/lib/documents";
import { hasEliteAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

type JobsPageProps = {
  searchParams: {
    message?: string;
  };
};

type RelationWithName = { name?: string | null } | { quote_number?: string | null } | { invoice_number?: string | null };

const upgradeMessage =
  "Reports and Job Tracking are available on Tradio Elite. Upgrade to unlock these features.";

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
    .select("plan, role, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!hasEliteAccess(profile)) {
    redirect(`/pricing?message=${encodeURIComponent(upgradeMessage)}`);
  }

  const [customersResult, quotesResult, invoicesResult, jobsResult] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("quotes")
        .select("id, quote_number, customer_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("id, invoice_number, customer_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("jobs")
        .select(
          "id, customer_id, title, description, status, start_date, due_date, completed_at, related_quote_id, related_invoice_id, notes, created_at, customers(name), quotes(quote_number), invoices(invoice_number)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const firstError =
    customersResult.error ??
    quotesResult.error ??
    invoicesResult.error ??
    jobsResult.error;

  if (firstError) {
    redirect(`/dashboard?message=${encodeURIComponent(firstError.message)}`);
  }

  const customers = customersResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const jobs = jobsResult.data ?? [];

  return (
    <AppShell active="jobs" plan={profile?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Elite job tracking</p>
          <h1 className="page-title">
            Track work from first quote to completed job.
          </h1>
        </div>
      </header>

      <div className="app-page-body">
        {searchParams.message ? (
          <p className="notice mb-5">{searchParams.message}</p>
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
              {jobs.map((job) => (
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
              ))}
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
