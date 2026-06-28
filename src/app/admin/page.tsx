import Link from "next/link";
import {
  Activity,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  MailPlus,
  ReceiptText,
  Search,
  UsersRound,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { formatDate } from "@/lib/documents";
import { requirePlatformAdmin } from "@/lib/admin-auth";

type AdminPageProps = {
  searchParams: Promise<{ q?: string }>;
};

type ProfileRow = {
  business_name: string | null;
  created_at: string;
  full_name: string | null;
  id: string;
  plan: string | null;
  subscription_status: string | null;
  trial_expires_at: string | null;
};

function planLabel(plan?: string | null) {
  if (!plan) return "No plan";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function statusClass(status?: string | null) {
  return status === "active"
    ? "bg-[#e7f7ef] text-[#177a55]"
    : "bg-slate-100 text-slate-600";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const [{ service, user }, search] = await Promise.all([
    requirePlatformAdmin(),
    searchParams,
  ]);
  const query = search.q?.trim().toLowerCase() ?? "";

  const [
    authUsersResult,
    profilesResult,
    customersResult,
    quotesResult,
    invoicesResult,
    leadsResult,
    jobsResult,
  ] = await Promise.all([
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    service
      .from("profiles")
      .select(
        "id, full_name, business_name, plan, subscription_status, trial_expires_at, created_at",
      )
      .order("created_at", { ascending: false }),
    service.from("customers").select("id", { count: "exact", head: true }),
    service.from("quotes").select("id", { count: "exact", head: true }),
    service.from("invoices").select("id", { count: "exact", head: true }),
    service.from("leads").select("id", { count: "exact", head: true }),
    service.from("jobs").select("id", { count: "exact", head: true }),
  ]);

  if (authUsersResult.error || profilesResult.error) {
    throw new Error(
      authUsersResult.error?.message ??
        profilesResult.error?.message ??
        "Admin account data could not be loaded.",
    );
  }

  const authUsers = authUsersResult.data.users;
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const usersById = new Map(authUsers.map((account) => [account.id, account]));
  const accounts = profiles
    .map((profile) => ({ profile, user: usersById.get(profile.id) }))
    .filter(({ profile, user: account }) => {
      if (!query) return true;
      return [
        account?.email,
        profile.full_name,
        profile.business_name,
        profile.plan,
      ].some((value) => value?.toLowerCase().includes(query));
    });

  const activeSubscriptions = profiles.filter(
    (profile) => profile.subscription_status === "active",
  ).length;
  const trials = profiles.filter(
    (profile) =>
      profile.plan === "trial" &&
      profile.subscription_status === "active" &&
      Boolean(
        profile.trial_expires_at &&
          new Date(profile.trial_expires_at).getTime() > Date.now(),
      ),
  ).length;
  const plans = ["lite", "pro", "elite"].map((plan) => ({
    count: profiles.filter(
      (profile) =>
        profile.plan === plan && profile.subscription_status === "active",
    ).length,
    plan,
  }));
  const moduleCounts = [
    { count: customersResult.count ?? 0, icon: UsersRound, label: "Customers" },
    { count: quotesResult.count ?? 0, icon: FileText, label: "Quotes" },
    { count: invoicesResult.count ?? 0, icon: ReceiptText, label: "Invoices" },
    { count: leadsResult.count ?? 0, icon: MailPlus, label: "Leads" },
    { count: jobsResult.count ?? 0, icon: BriefcaseBusiness, label: "Jobs" },
  ];

  return (
    <AdminShell email={user.email}>
      <header className="border-b border-field bg-white px-5 py-6 sm:px-8">
        <p className="eyebrow">Platform administration</p>
        <h1 className="page-title">Tradio business overview</h1>
        <p className="mt-2 text-sm text-slate-500">
          Read-only account and platform health information.
        </p>
      </header>

      <div className="space-y-6 p-5 sm:p-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="surface-pad">
            <UsersRound className="text-copper" size={20} />
            <p className="mt-4 text-sm text-slate-500">Registered accounts</p>
            <p className="mt-1 text-3xl font-black">{authUsers.length}</p>
          </article>
          <article className="surface-pad">
            <CreditCard className="text-copper" size={20} />
            <p className="mt-4 text-sm text-slate-500">Active subscriptions</p>
            <p className="mt-1 text-3xl font-black">{activeSubscriptions}</p>
          </article>
          <article className="surface-pad">
            <Activity className="text-copper" size={20} />
            <p className="mt-4 text-sm text-slate-500">Active trials</p>
            <p className="mt-1 text-3xl font-black">{trials}</p>
          </article>
          <article className="surface-pad">
            <BriefcaseBusiness className="text-copper" size={20} />
            <p className="mt-4 text-sm text-slate-500">Jobs tracked</p>
            <p className="mt-1 text-3xl font-black">{jobsResult.count ?? 0}</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="surface-pad">
            <h2 className="text-base font-semibold">Paid plan mix</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {plans.map(({ count, plan }) => (
                <div className="rounded-lg bg-mist p-4" key={plan}>
                  <p className="text-xs font-bold uppercase text-slate-500">
                    {plan}
                  </p>
                  <p className="mt-2 text-2xl font-black">{count}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-pad">
            <h2 className="text-base font-semibold">Platform activity</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {moduleCounts.map(({ count, icon: Icon, label }) => (
                <div className="rounded-lg border border-field p-3" key={label}>
                  <Icon className="text-copper" size={18} />
                  <p className="mt-3 text-xl font-black">{count}</p>
                  <p className="mt-1 text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="surface overflow-hidden" id="accounts">
          <div className="border-b border-field p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-base font-semibold">Customer accounts</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search by business, person, email, or plan.
                </p>
              </div>
              <form className="flex w-full max-w-md gap-2" method="get">
                <div className="relative min-w-0 flex-1">
                  <Search
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={17}
                  />
                  <input
                    className="field-control mt-0 pl-10"
                    defaultValue={search.q}
                    name="q"
                    placeholder="Search accounts"
                  />
                </div>
                <button className="btn-primary">Search</button>
              </form>
            </div>
          </div>

          <div className="divide-y divide-field">
            {accounts.length ? (
              accounts.map(({ profile, user: account }) => (
                <article
                  className="grid gap-4 p-5 md:grid-cols-[1fr_auto_auto] md:items-center"
                  key={profile.id}
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">
                      {profile.business_name || profile.full_name || "Unnamed account"}
                    </h3>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {account?.email ?? "No email available"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Joined {formatDate(profile.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <span className="status-pill bg-[#fff0e7] text-copper">
                      {planLabel(profile.plan)}
                    </span>
                    <span className={`status-pill ${statusClass(profile.subscription_status)}`}>
                      {profile.subscription_status ?? "inactive"}
                    </span>
                  </div>
                  <Link
                    className="btn-secondary justify-center"
                    href={`/admin/accounts/${profile.id}`}
                  >
                    View account
                  </Link>
                </article>
              ))
            ) : (
              <p className="p-8 text-center text-sm text-slate-500">
                No accounts match this search.
              </p>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

