import Link from "next/link";
import { ArrowLeft, FileText, MailPlus, ReceiptText, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { currency, formatDate } from "@/lib/documents";
import { requirePlatformAdmin, writeAdminAuditLog } from "@/lib/admin-auth";

type AdminAccountPageProps = {
  params: Promise<{ id: string }>;
};

type CustomerRelation = { name?: string | null };

function customerName(
  relation: CustomerRelation | CustomerRelation[] | null,
) {
  const customer = Array.isArray(relation) ? relation[0] : relation;
  return customer?.name ?? "Customer removed";
}

function titleCase(value?: string | null) {
  if (!value) return "Not set";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

export default async function AdminAccountPage({
  params,
}: AdminAccountPageProps) {
  const [{ id }, { service, user }] = await Promise.all([
    params,
    requirePlatformAdmin(),
  ]);
  const [authResult, profileResult] = await Promise.all([
    service.auth.admin.getUserById(id),
    service
      .from("profiles")
      .select(
        "id, full_name, business_name, trade, phone, plan, billing_interval, subscription_status, trial_expires_at, paypal_subscription_id, lead_email_address, created_at, cancelled_at, data_deletion_requested_at",
      )
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (authResult.error || !authResult.data.user || !profileResult.data) {
    notFound();
  }

  const account = authResult.data.user;
  const profile = profileResult.data;
  const [
    customersResult,
    quotesResult,
    invoicesResult,
    leadsResult,
    jobsResult,
    costsResult,
    recentQuotesResult,
    recentInvoicesResult,
    recentLeadsResult,
  ] = await Promise.all([
    service.from("customers").select("id", { count: "exact", head: true }).eq("user_id", id),
    service.from("quotes").select("id", { count: "exact", head: true }).eq("user_id", id),
    service.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", id),
    service.from("leads").select("id", { count: "exact", head: true }).eq("user_id", id),
    service.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", id),
    service.from("job_costs").select("id", { count: "exact", head: true }).eq("user_id", id),
    service
      .from("quotes")
      .select("id, quote_number, status, total, created_at, customers(name)")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    service
      .from("invoices")
      .select("id, invoice_number, status, total, created_at, customers(name)")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    service
      .from("leads")
      .select("id, customer_name, subject, status, source_platform, received_at")
      .eq("user_id", id)
      .order("received_at", { ascending: false })
      .limit(5),
  ]);

  await writeAdminAuditLog({
    action: "view_account_support_summary",
    adminUserId: user.id,
    metadata: { accountEmail: account.email ?? null },
    targetUserId: id,
  });

  const moduleCounts = [
    { count: customersResult.count ?? 0, label: "Customers" },
    { count: quotesResult.count ?? 0, label: "Quotes" },
    { count: invoicesResult.count ?? 0, label: "Invoices" },
    { count: leadsResult.count ?? 0, label: "Leads" },
    { count: jobsResult.count ?? 0, label: "Jobs" },
    { count: costsResult.count ?? 0, label: "Expenses" },
  ];

  return (
    <AdminShell active="accounts" email={user.email}>
      <header className="border-b border-field bg-white px-5 py-6 sm:px-8">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink" href="/admin#accounts">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to accounts
        </Link>
        <p className="eyebrow mt-5">Support account view</p>
        <h1 className="page-title">
          {profile.business_name || profile.full_name || account.email}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{account.email}</p>
      </header>

      <div className="space-y-6 p-5 sm:p-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {moduleCounts.map(({ count, label }) => (
            <article className="surface-pad" key={label}>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-black">{count}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="surface-pad">
            <h2 className="text-base font-semibold">Account details</h2>
            <dl className="mt-5 divide-y divide-field text-sm">
              {[
                ["Contact", profile.full_name || "Not set"],
                ["Business", profile.business_name || "Not set"],
                ["Trade", profile.trade || "Not set"],
                ["Phone", profile.phone || "Not set"],
                ["Lead email", profile.lead_email_address || "Not generated"],
                ["Joined", formatDate(profile.created_at)],
                ["Last sign in", account.last_sign_in_at ? formatDate(account.last_sign_in_at) : "Never"],
              ].map(([label, value]) => (
                <div className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]" key={label}>
                  <dt className="font-medium text-slate-500">{label}</dt>
                  <dd className="break-words font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="surface-pad">
            <h2 className="text-base font-semibold">Subscription</h2>
            <dl className="mt-5 divide-y divide-field text-sm">
              {[
                ["Plan", titleCase(profile.plan)],
                ["Billing", titleCase(profile.billing_interval)],
                ["Status", titleCase(profile.subscription_status)],
                ["Trial expires", profile.trial_expires_at ? formatDate(profile.trial_expires_at) : "Not applicable"],
                ["PayPal subscription", profile.paypal_subscription_id || "Not connected"],
                ["Cancelled", profile.cancelled_at ? formatDate(profile.cancelled_at) : "No"],
                ["Deletion requested", profile.data_deletion_requested_at ? formatDate(profile.data_deletion_requested_at) : "No"],
              ].map(([label, value]) => (
                <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr]" key={label}>
                  <dt className="font-medium text-slate-500">{label}</dt>
                  <dd className="break-words font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <article className="surface overflow-hidden">
            <div className="flex items-center gap-2 border-b border-field p-5">
              <FileText className="text-copper" size={18} />
              <h2 className="font-semibold">Recent quotes</h2>
            </div>
            <div className="divide-y divide-field">
              {(recentQuotesResult.data ?? []).length ? (
                (recentQuotesResult.data ?? []).map((quote) => (
                  <div className="p-4 text-sm" key={quote.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{quote.quote_number}</p>
                        <p className="mt-1 text-slate-500">{customerName(quote.customers)}</p>
                      </div>
                      <p className="font-semibold">{currency(quote.total)}</p>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{titleCase(quote.status)}</p>
                  </div>
                ))
              ) : (
                <p className="p-5 text-sm text-slate-500">No quotes.</p>
              )}
            </div>
          </article>

          <article className="surface overflow-hidden">
            <div className="flex items-center gap-2 border-b border-field p-5">
              <ReceiptText className="text-copper" size={18} />
              <h2 className="font-semibold">Recent invoices</h2>
            </div>
            <div className="divide-y divide-field">
              {(recentInvoicesResult.data ?? []).length ? (
                (recentInvoicesResult.data ?? []).map((invoice) => (
                  <div className="p-4 text-sm" key={invoice.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{invoice.invoice_number}</p>
                        <p className="mt-1 text-slate-500">{customerName(invoice.customers)}</p>
                      </div>
                      <p className="font-semibold">{currency(invoice.total)}</p>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{titleCase(invoice.status)}</p>
                  </div>
                ))
              ) : (
                <p className="p-5 text-sm text-slate-500">No invoices.</p>
              )}
            </div>
          </article>

          <article className="surface overflow-hidden">
            <div className="flex items-center gap-2 border-b border-field p-5">
              <MailPlus className="text-copper" size={18} />
              <h2 className="font-semibold">Recent leads</h2>
            </div>
            <div className="divide-y divide-field">
              {(recentLeadsResult.data ?? []).length ? (
                (recentLeadsResult.data ?? []).map((lead) => (
                  <div className="p-4 text-sm" key={lead.id}>
                    <p className="font-semibold">{lead.customer_name || "Unknown customer"}</p>
                    <p className="mt-1 line-clamp-2 text-slate-500">{lead.subject || "No subject"}</p>
                    <div className="mt-2 flex justify-between gap-3 text-xs text-slate-400">
                      <span>{lead.source_platform || "Email"}</span>
                      <span>{titleCase(lead.status)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-5 text-sm text-slate-500">No leads.</p>
              )}
            </div>
          </article>
        </section>

        <p className="text-xs leading-5 text-slate-500">
          This is a read-only support view. Opening it has been recorded in the
          administrator audit log.
        </p>
      </div>
    </AdminShell>
  );
}

