import {
  ArrowLeft,
  BriefcaseBusiness,
  FileText,
  MailPlus,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { logAdminSupportAccess, requireAdmin } from "@/lib/admin-support";
import { currency, formatDate } from "@/lib/documents";
import { createAdminClient } from "@/lib/supabase/admin";

type SupportViewPageProps = {
  params: {
    id: string;
  };
};

function relationName(relation: unknown) {
  if (!relation) {
    return "No customer";
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name ?? "No customer";
  }

  if (typeof relation === "object" && "name" in relation) {
    return String(relation.name ?? "No customer");
  }

  return "No customer";
}

export default async function AdminClientSupportPage({
  params,
}: SupportViewPageProps) {
  const { adminUser } = await requireAdmin();
  const admin = createAdminClient();

  const [
    authUserResult,
    profileResult,
    customersResult,
    leadsResult,
    quotesResult,
    invoicesResult,
    jobsResult,
  ] = await Promise.all([
    admin.auth.admin.getUserById(params.id),
    admin
      .from("profiles")
      .select(
        "id, full_name, business_name, trade, phone, plan, role, subscription_status, trial_expires_at, paypal_subscription_id, lead_email_address, created_at",
      )
      .eq("id", params.id)
      .maybeSingle(),
    admin
      .from("customers")
      .select("id, name, email, phone, postcode, created_at")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("leads")
      .select(
        "id, customer_name, source_platform, subject, phone, postcode, status, received_at",
      )
      .eq("user_id", params.id)
      .order("received_at", { ascending: false })
      .limit(8),
    admin
      .from("quotes")
      .select("id, quote_number, status, total, created_at, customers(name)")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("invoices")
      .select("id, invoice_number, status, total, due_date, created_at, customers(name)")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("jobs")
      .select("id, title, status, due_date, created_at, customers(name)")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (!profileResult.data) {
    notFound();
  }

  await logAdminSupportAccess({
    action: "view-client-support",
    adminUserId: adminUser.id,
    targetUserId: params.id,
  });

  const profile = profileResult.data;
  const email = authUserResult.data.user?.email ?? "No email found";
  const displayName = profile.business_name || profile.full_name || email;
  const customers = customersResult.data ?? [];
  const leads = leadsResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const unpaidTotal = invoices
    .filter((invoice) => ["unpaid", "overdue"].includes(invoice.status))
    .reduce((total, invoice) => total + Number(invoice.total ?? 0), 0);

  return (
    <AppShell active="admin">
      <header className="app-page-header">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Read-only support view</p>
            <h1 className="page-title">{displayName}</h1>
          </div>
          <Link className="btn-secondary" href="/dashboard/admin">
            <ArrowLeft aria-hidden="true" size={16} />
            Back to admin
          </Link>
        </div>
      </header>

      <div className="app-page-body">
        <section className="surface-pad">
          <div className="grid gap-5 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Email</p>
              <p className="mt-1 font-semibold">{email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Plan</p>
              <p className="mt-1 font-semibold">
                {profile.role === "admin"
                  ? "Admin"
                  : profile.plan
                    ? profile.plan
                    : "No plan"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Status</p>
              <p className="mt-1 font-semibold">
                {profile.subscription_status ?? "No status"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Lead email</p>
              <p className="mt-1 break-all font-semibold">
                {profile.lead_email_address ?? "Not generated"}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-500">
            This view is for support only. It reads client data without changing
            quotes, invoices, jobs, leads, or customers.
          </p>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="surface-pad">
            <UsersRound className="text-forest" size={20} />
            <p className="mt-3 text-2xl font-semibold">{customers.length}</p>
            <p className="text-sm text-slate-500">Recent customers</p>
          </article>
          <article className="surface-pad">
            <MailPlus className="text-forest" size={20} />
            <p className="mt-3 text-2xl font-semibold">{leads.length}</p>
            <p className="text-sm text-slate-500">Recent leads</p>
          </article>
          <article className="surface-pad">
            <FileText className="text-forest" size={20} />
            <p className="mt-3 text-2xl font-semibold">{quotes.length}</p>
            <p className="text-sm text-slate-500">Recent quotes</p>
          </article>
          <article className="surface-pad">
            <ReceiptText className="text-forest" size={20} />
            <p className="mt-3 text-2xl font-semibold">{invoices.length}</p>
            <p className="text-sm text-slate-500">Recent invoices</p>
          </article>
          <article className="surface-pad">
            <BriefcaseBusiness className="text-forest" size={20} />
            <p className="mt-3 text-2xl font-semibold">{currency(unpaidTotal)}</p>
            <p className="text-sm text-slate-500">Recent unpaid value</p>
          </article>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="surface overflow-hidden">
            <div className="section-bar">
              <h2 className="font-semibold">Leads</h2>
            </div>
            <div className="divide-y divide-field">
              {leads.length > 0 ? (
                leads.map((lead) => (
                  <div className="px-5 py-4" key={lead.id}>
                    <p className="font-semibold">
                      {lead.customer_name || lead.subject || "Unknown lead"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {lead.source_platform || "Email"} - {lead.status} -{" "}
                      {lead.received_at ? formatDate(lead.received_at) : "No date"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {lead.phone || "No phone"} - {lead.postcode || "No postcode"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-slate-500">No leads found.</p>
              )}
            </div>
          </section>

          <section className="surface overflow-hidden">
            <div className="section-bar">
              <h2 className="font-semibold">Customers</h2>
            </div>
            <div className="divide-y divide-field">
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <div className="px-5 py-4" key={customer.id}>
                    <p className="font-semibold">{customer.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {customer.email || "No email"} - {customer.phone || "No phone"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {customer.postcode || "No postcode"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-slate-500">
                  No customers found.
                </p>
              )}
            </div>
          </section>

          <section className="surface overflow-hidden">
            <div className="section-bar">
              <h2 className="font-semibold">Quotes</h2>
            </div>
            <div className="divide-y divide-field">
              {quotes.length > 0 ? (
                quotes.map((quote) => (
                  <div className="px-5 py-4" key={quote.id}>
                    <p className="font-semibold">{quote.quote_number}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {relationName(quote.customers)} - {quote.status} -{" "}
                      {currency(Number(quote.total ?? 0))}
                    </p>
                  </div>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-slate-500">No quotes found.</p>
              )}
            </div>
          </section>

          <section className="surface overflow-hidden">
            <div className="section-bar">
              <h2 className="font-semibold">Invoices</h2>
            </div>
            <div className="divide-y divide-field">
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <div className="px-5 py-4" key={invoice.id}>
                    <p className="font-semibold">{invoice.invoice_number}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {relationName(invoice.customers)} - {invoice.status} -{" "}
                      {currency(Number(invoice.total ?? 0))}
                    </p>
                  </div>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-slate-500">
                  No invoices found.
                </p>
              )}
            </div>
          </section>

          <section className="surface overflow-hidden xl:col-span-2">
            <div className="section-bar">
              <h2 className="font-semibold">Jobs</h2>
            </div>
            <div className="divide-y divide-field">
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <div
                    className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_auto]"
                    key={job.id}
                  >
                    <div>
                      <p className="font-semibold">{job.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {relationName(job.customers)}
                        {job.due_date ? ` - Due ${formatDate(job.due_date)}` : ""}
                      </p>
                    </div>
                    <span className="status-pill bg-field text-forest">
                      {job.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-slate-500">No jobs found.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
