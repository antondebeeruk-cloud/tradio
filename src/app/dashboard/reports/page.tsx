import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { currency } from "@/lib/documents";
import { hasEliteAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

const upgradeMessage =
  "Reports and Job Tracking are available on Tradio Elite. Upgrade to unlock these features.";

const jobStatusLabels: Record<string, string> = {
  cancelled: "Cancelled",
  completed: "Completed",
  in_progress: "In progress",
  not_started: "Not started",
};

const jobStatusClasses: Record<string, string> = {
  cancelled: "bg-[#fff0e7] text-[#d94800]",
  completed: "bg-[#e7f7ef] text-[#177a55]",
  in_progress: "bg-[#eaf2ff] text-[#265a93]",
  not_started: "bg-field text-forest",
};

type NamedRelation =
  | { name?: string | null }
  | { quote_number?: string | null; total?: number | string | null }
  | {
      invoice_number?: string | null;
      status?: string | null;
      total?: number | string | null;
    };

function numberValue(value: unknown) {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? number : 0;
}

function singleRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function relationName(relation: NamedRelation | NamedRelation[] | null | undefined) {
  const value = singleRelation(relation);

  if (!value) {
    return "";
  }

  if ("name" in value) {
    return value.name ?? "";
  }

  if ("invoice_number" in value) {
    return value.invoice_number ?? "";
  }

  if ("quote_number" in value) {
    return value.quote_number ?? "";
  }

  return "";
}

export default async function ReportsPage() {
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

  const [quotesResult, invoicesResult, jobsResult, jobCostsResult] =
    await Promise.all([
    supabase.from("quotes").select("id, status").eq("user_id", user.id),
    supabase.from("invoices").select("id, status, total").eq("user_id", user.id),
    supabase
      .from("jobs")
      .select(
        "id, title, status, created_at, customers(name), quotes(quote_number,total), invoices(invoice_number,status,total)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("job_costs")
      .select("id, job_id, total")
      .eq("user_id", user.id),
  ]);

  const firstError =
    quotesResult.error ??
    invoicesResult.error ??
    jobsResult.error ??
    jobCostsResult.error;

  if (firstError) {
    redirect(`/dashboard?message=${encodeURIComponent(firstError.message)}`);
  }

  const quotes = quotesResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const jobCosts = jobCostsResult.data ?? [];
  const acceptedQuotes = quotes.filter((quote) => quote.status === "accepted");
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const unpaidInvoices = invoices.filter((invoice) =>
    ["unpaid", "overdue"].includes(invoice.status),
  );
  const paidRevenue = paidInvoices.reduce(
    (total, invoice) => total + Number(invoice.total ?? 0),
    0,
  );
  const outstandingValue = unpaidInvoices.reduce(
    (total, invoice) => total + Number(invoice.total ?? 0),
    0,
  );
  const totalJobCosts = jobCosts.reduce(
    (total, cost) => total + Number(cost.total ?? 0),
    0,
  );
  const grossProfit = paidRevenue - totalJobCosts;
  const costsByJob = jobCosts.reduce<Record<string, typeof jobCosts>>(
    (map, cost) => {
      if (!cost.job_id) {
        return map;
      }

      const existingCosts = map[cost.job_id] ?? [];
      existingCosts.push(cost);
      map[cost.job_id] = existingCosts;

      return map;
    },
    {},
  );
  const jobProfitRows = jobs.map((job) => {
    const linkedInvoice = singleRelation(job.invoices);
    const linkedQuote = singleRelation(job.quotes);
    const income =
      linkedInvoice && "total" in linkedInvoice
        ? numberValue(linkedInvoice.total)
        : linkedQuote && "total" in linkedQuote
          ? numberValue(linkedQuote.total)
          : 0;
    const expenses = (costsByJob[job.id] ?? []).reduce(
      (total, cost) => total + numberValue(cost.total),
      0,
    );
    const profit = income - expenses;
    const margin = income > 0 ? (profit / income) * 100 : 0;

    return {
      customerName: relationName(job.customers) || "No customer",
      expenses,
      income,
      margin,
      profit,
      status: job.status,
      title: job.title,
    };
  });
  const jobsWithFigures = jobProfitRows.filter(
    (job) => job.income > 0 || job.expenses > 0,
  );
  const totalJobIncome = jobProfitRows.reduce(
    (total, job) => total + job.income,
    0,
  );
  const totalAllocatedCosts = jobProfitRows.reduce(
    (total, job) => total + job.expenses,
    0,
  );
  const totalJobProfit = totalJobIncome - totalAllocatedCosts;
  const totalJobMargin =
    totalJobIncome > 0 ? (totalJobProfit / totalJobIncome) * 100 : 0;
  const unallocatedCosts = jobCosts
    .filter((cost) => !cost.job_id)
    .reduce((total, cost) => total + numberValue(cost.total), 0);
  const conversionRate =
    quotes.length > 0 ? (acceptedQuotes.length / quotes.length) * 100 : 0;

  const stats = [
    {
      icon: FileText,
      label: "Total quotes created",
      value: String(quotes.length),
    },
    {
      icon: TrendingUp,
      label: "Total accepted quotes",
      value: String(acceptedQuotes.length),
    },
    {
      icon: ReceiptText,
      label: "Total invoices sent",
      value: String(invoices.length),
    },
    {
      icon: ReceiptText,
      label: "Total paid invoices",
      value: String(paidInvoices.length),
    },
    {
      icon: ReceiptText,
      label: "Total unpaid invoices",
      value: String(unpaidInvoices.length),
    },
    {
      icon: TrendingUp,
      label: "Total revenue from paid invoices",
      value: currency(paidRevenue),
    },
    {
      icon: BarChart3,
      label: "Outstanding invoice value",
      value: currency(outstandingValue),
    },
    {
      icon: ReceiptText,
      label: "Total job costs",
      value: currency(totalJobCosts),
    },
    {
      icon: TrendingUp,
      label: "Gross profit",
      value: currency(grossProfit),
    },
    {
      icon: TrendingUp,
      label: "Conversion rate",
      value: `${conversionRate.toFixed(1)}%`,
    },
  ];

  return (
    <AppShell active="reports" plan={profile?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Elite reports</p>
          <h1 className="page-title">
            See how quotes are turning into paid work.
          </h1>
        </div>
      </header>

      <div className="app-page-body">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article className="surface-pad" key={stat.label}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <div className="flex size-9 items-center justify-center rounded-lg bg-field text-forest">
                  <stat.icon aria-hidden="true" size={18} />
                </div>
              </div>
              <p className="mt-4 text-2xl font-semibold">{stat.value}</p>
            </article>
          ))}
        </div>

        <section className="surface mt-6 overflow-hidden">
          <div className="section-bar">
            <div>
              <p className="eyebrow">Job profit dashboard</p>
              <h2 className="font-semibold">Income, expenses, and profit by job</h2>
            </div>
          </div>

          <div className="grid gap-4 border-b border-field p-5 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-lg border border-field bg-mist p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">Job income</p>
                <BriefcaseBusiness aria-hidden="true" className="text-forest" size={18} />
              </div>
              <p className="mt-3 text-2xl font-semibold">
                {currency(totalJobIncome)}
              </p>
            </article>
            <article className="rounded-lg border border-field bg-mist p-4">
              <p className="text-sm font-medium text-slate-500">Allocated expenses</p>
              <p className="mt-3 text-2xl font-semibold">
                {currency(totalAllocatedCosts)}
              </p>
            </article>
            <article className="rounded-lg border border-field bg-mist p-4">
              <p className="text-sm font-medium text-slate-500">Job profit</p>
              <p
                className={`mt-3 text-2xl font-semibold ${
                  totalJobProfit >= 0 ? "text-[#177a55]" : "text-[#d94800]"
                }`}
              >
                {currency(totalJobProfit)}
              </p>
            </article>
            <article className="rounded-lg border border-field bg-mist p-4">
              <p className="text-sm font-medium text-slate-500">Average margin</p>
              <p className="mt-3 text-2xl font-semibold">
                {totalJobMargin.toFixed(1)}%
              </p>
              {unallocatedCosts > 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  {currency(unallocatedCosts)} in unallocated receipts.
                </p>
              ) : null}
            </article>
          </div>

          {jobsWithFigures.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-mist text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Job</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Income</th>
                    <th className="px-5 py-3 font-semibold">Expenses</th>
                    <th className="px-5 py-3 font-semibold">Profit</th>
                    <th className="px-5 py-3 font-semibold">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-field">
                  {jobsWithFigures.map((job) => (
                    <tr key={`${job.title}-${job.customerName}`}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink">{job.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {job.customerName}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`status-pill ${
                            jobStatusClasses[job.status] ??
                            jobStatusClasses.not_started
                          }`}
                        >
                          {jobStatusLabels[job.status] ?? job.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        {currency(job.income)}
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        {currency(job.expenses)}
                      </td>
                      <td
                        className={`px-5 py-4 font-semibold ${
                          job.profit >= 0 ? "text-[#177a55]" : "text-[#d94800]"
                        }`}
                      >
                        {currency(job.profit)}
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        {job.margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-field text-forest">
                <BriefcaseBusiness aria-hidden="true" size={24} />
              </div>
              <h2 className="mt-4 text-lg font-semibold">
                No job profit figures yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Link invoices or quotes to jobs and allocate receipts to see
                profit and margin here.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
