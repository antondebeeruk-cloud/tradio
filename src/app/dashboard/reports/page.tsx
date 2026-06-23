import { BarChart3, FileText, ReceiptText, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { currency } from "@/lib/documents";
import { hasEliteAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

const upgradeMessage =
  "Reports and Job Tracking are available on Tradio Elite. Upgrade to unlock these features.";

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

  const [quotesResult, invoicesResult] = await Promise.all([
    supabase.from("quotes").select("id, status").eq("user_id", user.id),
    supabase.from("invoices").select("id, status, total").eq("user_id", user.id),
  ]);

  const firstError = quotesResult.error ?? invoicesResult.error;

  if (firstError) {
    redirect(`/dashboard?message=${encodeURIComponent(firstError.message)}`);
  }

  const quotes = quotesResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
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
      </div>
    </AppShell>
  );
}
