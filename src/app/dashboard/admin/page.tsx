import {
  BarChart3,
  BriefcaseBusiness,
  MailPlus,
  ReceiptText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { logAdminSupportAccess, requireAdmin } from "@/lib/admin-support";
import { currency, formatDate } from "@/lib/documents";
import { createAdminClient } from "@/lib/supabase/admin";

function planLabel(plan?: string | null, role?: string | null) {
  if (role === "admin") {
    return "Admin";
  }

  if (!plan) {
    return "No plan";
  }

  return plan[0].toUpperCase() + plan.slice(1);
}

export default async function AdminDashboardPage() {
  const { adminUser } = await requireAdmin();
  const admin = createAdminClient();

  await logAdminSupportAccess({
    action: "view-admin-dashboard",
    adminUserId: adminUser.id,
  });

  const [
    authUsersResult,
    profilesResult,
    customersResult,
    quotesResult,
    invoicesResult,
    leadsResult,
    jobsResult,
    logsResult,
  ] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    admin
      .from("profiles")
      .select(
        "id, full_name, business_name, trade, plan, role, subscription_status, trial_expires_at, lead_email_address, created_at",
      )
      .order("created_at", { ascending: false }),
    admin.from("customers").select("id", { count: "exact", head: true }),
    admin.from("quotes").select("id, status, total, created_at"),
    admin.from("invoices").select("id, status, total, created_at"),
    admin.from("leads").select("id", { count: "exact", head: true }),
    admin.from("jobs").select("id, status", { count: "exact" }),
    admin
      .from("admin_support_access_logs")
      .select("id, action, admin_user_id, target_user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const profiles = profilesResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const logs = logsResult.data ?? [];
  const emailById = new Map(
    (authUsersResult.data.users ?? []).map((user) => [user.id, user.email ?? ""]),
  );

  const paidRevenue = invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((total, invoice) => total + Number(invoice.total ?? 0), 0);
  const outstandingValue = invoices
    .filter((invoice) => ["unpaid", "overdue"].includes(invoice.status))
    .reduce((total, invoice) => total + Number(invoice.total ?? 0), 0);
  const acceptedQuotes = quotes.filter((quote) => quote.status === "accepted");
  const completedJobs = jobs.filter((job) => job.status === "completed");

  const stats = [
    {
      icon: UsersRound,
      label: "Accounts",
      value: String(profiles.length),
      note: `${customersResult.count ?? 0} customers saved`,
    },
    {
      icon: BarChart3,
      label: "Quotes",
      value: String(quotes.length),
      note: `${acceptedQuotes.length} accepted`,
    },
    {
      icon: ReceiptText,
      label: "Paid revenue",
      value: currency(paidRevenue),
      note: `${currency(outstandingValue)} outstanding`,
    },
    {
      icon: MailPlus,
      label: "Leads",
      value: String(leadsResult.count ?? 0),
      note: "Captured by email",
    },
    {
      icon: BriefcaseBusiness,
      label: "Jobs",
      value: String(jobs.length),
      note: `${completedJobs.length} completed`,
    },
  ];

  return (
    <AppShell active="admin">
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Admin support</p>
          <h1 className="page-title">Back-end reporting and client support.</h1>
        </div>
      </header>

      <div className="app-page-body">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              <p className="mt-1 text-sm text-slate-500">{stat.note}</p>
            </article>
          ))}
        </div>

        <section className="surface mt-6 overflow-hidden">
          <div className="section-bar">
            <h2 className="font-semibold">Client accounts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Open a read-only support view for a customer account.
            </p>
          </div>

          <div className="divide-y divide-field">
            {profiles.map((profile) => {
              const email = emailById.get(profile.id) ?? "No email found";
              const name =
                profile.business_name || profile.full_name || email || "Client";

              return (
                <div
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center"
                  key={profile.id}
                >
                  <div>
                    <p className="font-semibold">{name}</p>
                    <p className="mt-1 text-sm text-slate-500">{email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Joined {formatDate(profile.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="status-pill bg-field text-forest">
                      {planLabel(profile.plan, profile.role)}
                    </span>
                    <span className="status-pill bg-[#eaf2ff] text-[#265a93]">
                      {profile.subscription_status ?? "No status"}
                    </span>
                    {profile.lead_email_address ? (
                      <span className="status-pill bg-[#fff5ef] text-[#d94800]">
                        Leads active
                      </span>
                    ) : null}
                  </div>

                  <Link
                    className="btn-secondary"
                    href={`/dashboard/admin/users/${profile.id}`}
                  >
                    <ShieldCheck aria-hidden="true" size={16} />
                    Support view
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        <section className="surface mt-6 overflow-hidden">
          <div className="section-bar">
            <h2 className="font-semibold">Recent support access</h2>
            <p className="mt-1 text-sm text-slate-500">
              Audit trail for admin support views.
            </p>
          </div>
          <div className="divide-y divide-field">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div className="px-5 py-4 text-sm" key={log.id}>
                  <p className="font-semibold text-ink">{log.action}</p>
                  <p className="mt-1 text-slate-500">
                    {formatDate(log.created_at)} by{" "}
                    {emailById.get(log.admin_user_id) ?? log.admin_user_id}
                    {log.target_user_id
                      ? ` for ${emailById.get(log.target_user_id) ?? log.target_user_id}`
                      : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-sm text-slate-500">
                No support access has been logged yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
