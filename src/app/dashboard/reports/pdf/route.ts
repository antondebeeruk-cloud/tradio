import { NextResponse } from "next/server";
import { currency, formatDate } from "@/lib/documents";
import { createReportPdf } from "@/lib/report-pdf";
import { hasEliteAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

type NamedRelation =
  | { name?: string | null }
  | { quote_number?: string | null; total?: number | string | null }
  | {
      invoice_number?: string | null;
      status?: string | null;
      total?: number | string | null;
    };

const jobStatusLabels: Record<string, string> = {
  cancelled: "Cancelled",
  completed: "Completed",
  in_progress: "In progress",
  not_started: "Not started",
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

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!hasEliteAccess(profile)) {
    return NextResponse.json(
      { error: "This report is available on Tradio Elite." },
      { status: 403 },
    );
  }

  const [quotesResult, invoicesResult, jobsResult, jobCostsResult] =
    await Promise.all([
      supabase.from("quotes").select("id, status").eq("user_id", user.id),
      supabase
        .from("invoices")
        .select("id, status, total")
        .eq("user_id", user.id),
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
    return NextResponse.json({ error: firstError.message }, { status: 500 });
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
    (total, invoice) => total + numberValue(invoice.total),
    0,
  );
  const outstandingValue = unpaidInvoices.reduce(
    (total, invoice) => total + numberValue(invoice.total),
    0,
  );
  const totalJobCosts = jobCosts.reduce(
    (total, cost) => total + numberValue(cost.total),
    0,
  );
  const conversionRate =
    quotes.length > 0 ? (acceptedQuotes.length / quotes.length) * 100 : 0;
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
  const jobRows = jobs.map((job) => {
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
  const jobsWithFigures = jobRows.filter(
    (job) => job.income > 0 || job.expenses > 0,
  );
  const totalJobIncome = jobRows.reduce((total, job) => total + job.income, 0);
  const totalAllocatedCosts = jobRows.reduce(
    (total, job) => total + job.expenses,
    0,
  );
  const totalJobProfit = totalJobIncome - totalAllocatedCosts;
  const totalJobMargin =
    totalJobIncome > 0 ? (totalJobProfit / totalJobIncome) * 100 : 0;
  const unallocatedCosts = jobCosts
    .filter((cost) => !cost.job_id)
    .reduce((total, cost) => total + numberValue(cost.total), 0);

  const pdf = createReportPdf({
    businessName: profile?.business_name ?? "Tradio",
    generatedAt: formatDate(new Date().toISOString()),
    jobs: jobsWithFigures.map((job) => ({
      customerName: job.customerName,
      expenses: currency(job.expenses),
      income: currency(job.income),
      margin: `${job.margin.toFixed(1)}%`,
      profit: currency(job.profit),
      status: jobStatusLabels[job.status] ?? job.status,
      title: job.title,
    })),
    stats: [
      { label: "Total quotes created", value: String(quotes.length) },
      { label: "Total accepted quotes", value: String(acceptedQuotes.length) },
      { label: "Total invoices sent", value: String(invoices.length) },
      { label: "Total paid invoices", value: String(paidInvoices.length) },
      { label: "Total unpaid invoices", value: String(unpaidInvoices.length) },
      { label: "Paid invoice revenue", value: currency(paidRevenue) },
      { label: "Outstanding invoice value", value: currency(outstandingValue) },
      { label: "Total job costs", value: currency(totalJobCosts) },
      { label: "Job income", value: currency(totalJobIncome) },
      { label: "Job profit", value: currency(totalJobProfit) },
      { label: "Average job margin", value: `${totalJobMargin.toFixed(1)}%` },
      { label: "Quote conversion rate", value: `${conversionRate.toFixed(1)}%` },
    ],
    title: "Reports and job profit",
    unallocatedCosts: currency(unallocatedCosts),
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Disposition": 'attachment; filename="tradio-reports.pdf"',
      "Content-Type": "application/pdf",
    },
  });
}
