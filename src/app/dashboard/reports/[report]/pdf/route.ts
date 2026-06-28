import { NextResponse } from "next/server";
import { formatDate } from "@/lib/documents";
import { createFinancialReportPdf } from "@/lib/financial-report-pdf";
import { createClient } from "@/lib/supabase/server";

type ReportRouteProps = {
  params: {
    report: string;
  };
};

type CustomerRelation = { name?: string | null };
type TotalRelation = { total?: number | string | null };

type JobForReport = {
  customers: CustomerRelation | CustomerRelation[] | null;
  id: string;
  invoices: TotalRelation | TotalRelation[] | null;
  job_type: string | null;
  quotes: TotalRelation | TotalRelation[] | null;
  title: string;
};

type CostForReport = {
  category: string | null;
  job_id: string | null;
  total: number | string | null;
};

type PeriodTotals = {
  costs: number;
  labour: number;
  materials: number;
  revenue: number;
};

const money = (value: number) =>
  `GBP ${new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)}`;

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function relationName(relation: CustomerRelation | CustomerRelation[] | null) {
  const customer = Array.isArray(relation) ? relation[0] : relation;
  return customer?.name ?? "Customer removed";
}

function relationTotal(relation: TotalRelation | TotalRelation[] | null) {
  const value = Array.isArray(relation) ? relation[0] : relation;
  return numberValue(value?.total);
}

function jobFigures(jobs: JobForReport[], costs: CostForReport[]) {
  const costsByJob = costs.reduce<Record<string, CostForReport[]>>(
    (map, cost) => {
      if (!cost.job_id) return map;
      (map[cost.job_id] ??= []).push(cost);
      return map;
    },
    {},
  );

  return jobs.map((job) => {
    const jobCosts = costsByJob[job.id] ?? [];
    const income = relationTotal(job.invoices) || relationTotal(job.quotes);
    const materials = jobCosts
      .filter((cost) => cost.category === "materials")
      .reduce((total, cost) => total + numberValue(cost.total), 0);
    const totalCosts = jobCosts.reduce(
      (total, cost) => total + numberValue(cost.total),
      0,
    );
    const profit = income - totalCosts;

    return {
      customerName: relationName(job.customers),
      income,
      jobType: job.job_type?.trim() || job.title,
      margin: income > 0 ? (profit / income) * 100 : 0,
      materials,
      profit,
      title: job.title,
      totalCosts,
    };
  });
}

function startOfWeek(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const dayFromMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayFromMonday);
  return date.toISOString().slice(0, 10);
}

function periodKey(value: string, period: "week" | "month" | "year") {
  if (period === "week") {
    return startOfWeek(value);
  }

  if (period === "month") {
    return value.slice(0, 7);
  }

  return value.slice(0, 4);
}

function periodLabel(key: string, period: "week" | "month" | "year") {
  if (period === "week") {
    return `Week of ${formatDate(key)}`;
  }

  if (period === "month") {
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(new Date(`${key}-01T00:00:00Z`));
  }

  return key;
}

function createProfitRows(
  invoices: { issue_date: string; total: number | string | null }[],
  costs: {
    category: string | null;
    purchase_date: string;
    total: number | string | null;
  }[],
  period: "week" | "month" | "year",
  limit: number,
) {
  const totals = new Map<string, PeriodTotals>();
  const getTotals = (key: string) => {
    const existing = totals.get(key);
    if (existing) return existing;

    const created = { costs: 0, labour: 0, materials: 0, revenue: 0 };
    totals.set(key, created);
    return created;
  };

  invoices.forEach((invoice) => {
    getTotals(periodKey(invoice.issue_date, period)).revenue += numberValue(
      invoice.total,
    );
  });

  costs.forEach((cost) => {
    const periodTotals = getTotals(periodKey(cost.purchase_date, period));
    const amount = numberValue(cost.total);
    periodTotals.costs += amount;

    if (cost.category === "materials") {
      periodTotals.materials += amount;
    }
    if (["labour", "subcontractor"].includes(cost.category ?? "")) {
      periodTotals.labour += amount;
    }
  });

  return Array.from(totals.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, limit)
    .map(([key, values]) => {
      const profit = values.revenue - values.costs;
      const margin = values.revenue > 0 ? (profit / values.revenue) * 100 : 0;
      return [
        periodLabel(key, period),
        money(values.revenue),
        money(values.materials),
        money(values.labour),
        money(profit),
        `${margin.toFixed(1)}%`,
      ];
    });
}

async function profitReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  businessName: string,
) {
  const [invoiceResult, costResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("issue_date, total")
      .eq("user_id", userId)
      .eq("status", "paid"),
    supabase
      .from("job_costs")
      .select("purchase_date, category, total")
      .eq("user_id", userId),
  ]);

  const error = invoiceResult.error ?? costResult.error;
  if (error) throw error;

  const invoices = invoiceResult.data ?? [];
  const costs = costResult.data ?? [];
  const revenue = invoices.reduce(
    (total, invoice) => total + numberValue(invoice.total),
    0,
  );
  const materialCosts = costs
    .filter((cost) => cost.category === "materials")
    .reduce((total, cost) => total + numberValue(cost.total), 0);
  const labourCosts = costs
    .filter((cost) => ["labour", "subcontractor"].includes(cost.category ?? ""))
    .reduce((total, cost) => total + numberValue(cost.total), 0);
  const totalCosts = costs.reduce(
    (total, cost) => total + numberValue(cost.total),
    0,
  );
  const otherCosts = totalCosts - materialCosts - labourCosts;
  const grossProfit = revenue - totalCosts;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const columns = [
    { label: "Period", x: 50 },
    { label: "Revenue", x: 180 },
    { label: "Materials", x: 265 },
    { label: "Labour", x: 350 },
    { label: "Profit", x: 435 },
    { label: "Margin", x: 520 },
  ];

  return createFinancialReportPdf({
    businessName,
    generatedAt: formatDate(new Date().toISOString()),
    sections: [
      {
        columns,
        rows: createProfitRows(invoices, costs, "week", 26),
        title: "Profit by week",
      },
      {
        columns,
        rows: createProfitRows(invoices, costs, "month", 24),
        title: "Profit by month",
      },
      {
        columns,
        rows: createProfitRows(invoices, costs, "year", 10),
        title: "Profit by year",
      },
    ],
    stats: [
      { label: "Revenue from paid invoices", value: money(revenue) },
      { label: "Material costs", value: money(materialCosts) },
      { label: "Labour and subcontractor costs", value: money(labourCosts) },
      { label: "Other recorded costs", value: money(otherCosts) },
      { label: "Gross profit", value: money(grossProfit) },
      { label: "Profit margin", value: `${margin.toFixed(1)}%` },
    ],
    title: "Profit Report",
  });
}

async function monthlyRevenueReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  businessName: string,
) {
  const { data, error } = await supabase
    .from("invoices")
    .select("issue_date, total")
    .eq("user_id", userId)
    .eq("status", "paid");

  if (error) throw error;

  const revenueByMonth = (data ?? []).reduce<Record<string, number>>(
    (map, invoice) => {
      const key = invoice.issue_date.slice(0, 7);
      map[key] = (map[key] ?? 0) + numberValue(invoice.total);
      return map;
    },
    {},
  );
  const monthKeys = Array.from({ length: 12 }, (_, offset) => {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - (11 - offset));
    return date.toISOString().slice(0, 7);
  });
  const rows = monthKeys.map((key) => [
    periodLabel(key, "month"),
    money(revenueByMonth[key] ?? 0),
  ]);
  const values = monthKeys.map((key) => revenueByMonth[key] ?? 0);
  const totalRevenue = values.reduce((total, value) => total + value, 0);
  const bestIndex = values.indexOf(Math.max(...values));
  const slowestIndex = values.indexOf(Math.min(...values));

  return createFinancialReportPdf({
    businessName,
    generatedAt: formatDate(new Date().toISOString()),
    sections: [
      {
        columns: [
          { label: "Month", x: 50 },
          { label: "Revenue", x: 300 },
        ],
        rows,
        title: "Revenue month by month",
      },
    ],
    stats: [
      { label: "Revenue in the last 12 months", value: money(totalRevenue) },
      { label: "Average monthly revenue", value: money(totalRevenue / 12) },
      {
        label: "Strongest month",
        value: `${periodLabel(monthKeys[bestIndex], "month")} - ${money(values[bestIndex])}`,
      },
      {
        label: "Slowest month",
        value: `${periodLabel(monthKeys[slowestIndex], "month")} - ${money(values[slowestIndex])}`,
      },
    ],
    title: "Monthly Revenue Report",
  });
}

async function loadCompletedJobFigures(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const [jobsResult, costsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, title, job_type, customers(name), quotes(total), invoices(total)",
      )
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false }),
    supabase
      .from("job_costs")
      .select("job_id, category, total")
      .eq("user_id", userId),
  ]);

  const error = jobsResult.error ?? costsResult.error;
  if (error) throw error;

  return jobFigures(
    (jobsResult.data ?? []) as unknown as JobForReport[],
    (costsResult.data ?? []) as CostForReport[],
  );
}

async function jobProfitabilityReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  businessName: string,
) {
  const jobs = await loadCompletedJobFigures(supabase, userId);
  const income = jobs.reduce((total, job) => total + job.income, 0);
  const costs = jobs.reduce((total, job) => total + job.totalCosts, 0);
  const profit = income - costs;
  const margin = income > 0 ? (profit / income) * 100 : 0;

  return createFinancialReportPdf({
    businessName,
    generatedAt: formatDate(new Date().toISOString()),
    sections: [
      {
        columns: [
          { label: "Completed job", x: 50 },
          { label: "Income", x: 250 },
          { label: "Materials", x: 330 },
          { label: "All costs", x: 410 },
          { label: "Profit", x: 485 },
          { label: "Margin", x: 540 },
        ],
        rows: jobs.map((job) => [
          `${job.title} - ${job.customerName}`,
          money(job.income),
          money(job.materials),
          money(job.totalCosts),
          money(job.profit),
          `${job.margin.toFixed(1)}%`,
        ]),
        title: "Completed job profitability",
      },
    ],
    stats: [
      { label: "Completed jobs", value: String(jobs.length) },
      { label: "Income", value: money(income) },
      { label: "Costs", value: money(costs) },
      { label: "Profit", value: money(profit) },
      { label: "Overall margin", value: `${margin.toFixed(1)}%` },
    ],
    title: "Job Profitability",
  });
}

async function bestJobTypesReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  businessName: string,
) {
  const jobs = await loadCompletedJobFigures(supabase, userId);
  const grouped = jobs.reduce<
    Record<
      string,
      { count: number; costs: number; income: number; label: string; profit: number }
    >
  >((map, job) => {
    const key = job.jobType.toLowerCase();
    const group = (map[key] ??= {
      count: 0,
      costs: 0,
      income: 0,
      label: job.jobType,
      profit: 0,
    });
    group.count += 1;
    group.costs += job.totalCosts;
    group.income += job.income;
    group.profit += job.profit;
    return map;
  }, {});
  const groups = Object.values(grouped).sort(
    (left, right) => right.profit - left.profit,
  );
  const best = groups[0];

  return createFinancialReportPdf({
    businessName,
    generatedAt: formatDate(new Date().toISOString()),
    sections: [
      {
        columns: [
          { label: "Job type", x: 50 },
          { label: "Jobs", x: 235 },
          { label: "Income", x: 300 },
          { label: "Costs", x: 390 },
          { label: "Profit", x: 470 },
          { label: "Margin", x: 535 },
        ],
        rows: groups.map((group) => {
          const margin =
            group.income > 0 ? (group.profit / group.income) * 100 : 0;
          return [
            group.label,
            String(group.count),
            money(group.income),
            money(group.costs),
            money(group.profit),
            `${margin.toFixed(1)}%`,
          ];
        }),
        title: "Profit by job type",
      },
    ],
    stats: [
      { label: "Completed jobs analysed", value: String(jobs.length) },
      { label: "Job types", value: String(groups.length) },
      { label: "Most profitable job type", value: best?.label ?? "No data" },
      { label: "Best job type profit", value: money(best?.profit ?? 0) },
    ],
    title: "Best Job Types",
  });
}

async function outstandingReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  businessName: string,
) {
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number, total, due_date, customers(name)")
    .eq("user_id", userId)
    .in("status", ["unpaid", "overdue"])
    .order("due_date", { ascending: true });

  if (error) throw error;

  const invoices = data ?? [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = invoices.map((invoice) => {
    const dueDate = invoice.due_date ? new Date(`${invoice.due_date}T00:00:00`) : null;
    const overdueDays = dueDate
      ? Math.max(Math.floor((today.getTime() - dueDate.getTime()) / 86400000), 0)
      : 0;

    return [
      relationName(invoice.customers),
      invoice.invoice_number,
      money(numberValue(invoice.total)),
      invoice.due_date ? formatDate(invoice.due_date) : "No due date",
      String(overdueDays),
    ];
  });
  const total = invoices.reduce(
    (sum, invoice) => sum + numberValue(invoice.total),
    0,
  );

  return createFinancialReportPdf({
    businessName,
    generatedAt: formatDate(new Date().toISOString()),
    sections: [
      {
        columns: [
          { label: "Customer", x: 50 },
          { label: "Invoice", x: 210 },
          { label: "Amount", x: 330 },
          { label: "Due date", x: 420 },
          { label: "Days overdue", x: 510 },
        ],
        rows,
        title: "What am I still owed?",
      },
    ],
    stats: [
      { label: "Outstanding invoices", value: String(invoices.length) },
      { label: "Total outstanding", value: money(total) },
    ],
    title: "Outstanding Payments",
  });
}

async function quoteSuccessReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  businessName: string,
) {
  const { data, error } = await supabase
    .from("quotes")
    .select("status, total")
    .eq("user_id", userId);

  if (error) throw error;

  const quotes = data ?? [];
  const sent = quotes.filter((quote) => quote.status !== "draft");
  const accepted = quotes.filter((quote) => quote.status === "accepted");
  const declined = quotes.filter((quote) => quote.status === "rejected");
  const awaiting = quotes.filter((quote) => quote.status === "sent");
  const decisions = accepted.length + declined.length;
  const winRate = decisions > 0 ? (accepted.length / decisions) * 100 : 0;
  const valueWon = accepted.reduce(
    (total, quote) => total + numberValue(quote.total),
    0,
  );

  return createFinancialReportPdf({
    businessName,
    generatedAt: formatDate(new Date().toISOString()),
    sections: [
      {
        columns: [
          { label: "Outcome", x: 50 },
          { label: "Quotes", x: 260 },
          { label: "Share of sent quotes", x: 380 },
        ],
        rows: [
          ["Accepted", String(accepted.length), sent.length ? `${((accepted.length / sent.length) * 100).toFixed(1)}%` : "0.0%"],
          ["Declined", String(declined.length), sent.length ? `${((declined.length / sent.length) * 100).toFixed(1)}%` : "0.0%"],
          ["Awaiting response", String(awaiting.length), sent.length ? `${((awaiting.length / sent.length) * 100).toFixed(1)}%` : "0.0%"],
        ],
        title: "Quote outcomes",
      },
    ],
    stats: [
      { label: "Quotes sent", value: String(sent.length) },
      { label: "Quotes accepted", value: String(accepted.length) },
      { label: "Quotes declined", value: String(declined.length) },
      { label: "Win rate (accepted decisions)", value: `${winRate.toFixed(1)}%` },
      { label: "Value won", value: money(valueWon) },
    ],
    title: "Quote Success Report",
  });
}

export async function GET(request: Request, { params }: ReportRouteProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name")
    .eq("id", user.id)
    .maybeSingle();
  const businessName = profile?.business_name ?? "Tradio";

  try {
    let pdf: Buffer;
    let filename: string;

    if (params.report === "profit") {
      pdf = await profitReport(supabase, user.id, businessName);
      filename = "tradio-profit-report.pdf";
    } else if (params.report === "monthly-revenue") {
      pdf = await monthlyRevenueReport(supabase, user.id, businessName);
      filename = "tradio-monthly-revenue.pdf";
    } else if (params.report === "job-profitability") {
      pdf = await jobProfitabilityReport(supabase, user.id, businessName);
      filename = "tradio-job-profitability.pdf";
    } else if (params.report === "best-job-types") {
      pdf = await bestJobTypesReport(supabase, user.id, businessName);
      filename = "tradio-best-job-types.pdf";
    } else if (params.report === "outstanding-payments") {
      pdf = await outstandingReport(supabase, user.id, businessName);
      filename = "tradio-outstanding-payments.pdf";
    } else if (params.report === "quote-success") {
      pdf = await quoteSuccessReport(supabase, user.id, businessName);
      filename = "tradio-quote-success-report.pdf";
    } else {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report could not be created." },
      { status: 500 },
    );
  }
}
