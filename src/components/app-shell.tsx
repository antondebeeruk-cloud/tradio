import {
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  MailPlus,
  BarChart3,
  BriefcaseBusiness,
  ReceiptText,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { AccountMenu } from "@/components/account-menu";
import { TradioLogo } from "@/components/tradio-logo";
import { hasAdminAccess } from "@/lib/admin-access";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Customers", href: "/customers", icon: UsersRound },
  { label: "Leads", href: "/dashboard/leads", icon: MailPlus },
  { label: "Quotes", href: "/quotes", icon: FileText },
  { label: "Invoices", href: "/invoices", icon: ReceiptText },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    eliteOnly: true,
  },
  {
    label: "Jobs",
    href: "/dashboard/jobs",
    icon: BriefcaseBusiness,
    eliteOnly: true,
  },
  { label: "Settings", href: "/settings", icon: Settings },
  {
    label: "Admin",
    href: "/dashboard/admin",
    icon: ShieldCheck,
    adminOnly: true,
  },
];

type AppShellProps = {
  active:
    | "dashboard"
    | "customers"
    | "leads"
    | "quotes"
    | "invoices"
    | "reports"
    | "jobs"
    | "settings"
    | "admin"
    | "account";
  children: React.ReactNode;
  plan?: string | null;
};

const eliteUpgradeMessage =
  "Reports and Job Tracking are available on Tradio Elite. Upgrade to unlock these features.";

const activeByHref: Record<string, AppShellProps["active"]> = {
  "/customers": "customers",
  "/dashboard": "dashboard",
  "/dashboard/leads": "leads",
  "/dashboard/jobs": "jobs",
  "/dashboard/reports": "reports",
  "/dashboard/admin": "admin",
  "/invoices": "invoices",
  "/quotes": "quotes",
  "/settings": "settings",
};

function initialsFor(nameOrEmail: string) {
  const name = nameOrEmail.trim();

  if (!name) {
    return "T";
  }

  if (name.includes("@")) {
    return name.slice(0, 2).toUpperCase();
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function planLabelFor(plan?: string | null, role?: string | null) {
  if (role === "admin") {
    return "Admin";
  }

  if (plan === "trial") {
    return "Trial";
  }

  if (plan === "lite") {
    return "Lite";
  }

  if (plan === "elite") {
    return "Elite";
  }

  return "No plan";
}

function NavLink({
  active,
  effectivePlan,
  item,
  mobile = false,
}: {
  active: AppShellProps["active"];
  effectivePlan?: string | null;
  item: (typeof navItems)[number];
  mobile?: boolean;
}) {
  const isLocked = item.eliteOnly && effectivePlan === "lite";
  const href = isLocked
    ? `/pricing?message=${encodeURIComponent(eliteUpgradeMessage)}`
    : item.href;
  const isActive = activeByHref[item.href] === active;
  const Icon = item.icon;

  if (mobile) {
    return (
      <Link
        className={`flex min-w-[76px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold transition ${
          isActive
            ? "bg-copper text-white"
            : "text-white/72 hover:bg-white/10 hover:text-white"
        }`}
        href={href}
      >
        <span className="relative">
          <Icon aria-hidden="true" size={19} />
          {isLocked ? (
            <Lock
              aria-hidden="true"
              className="absolute -right-2 -top-1 text-copper"
              size={11}
            />
          ) : null}
        </span>
        <span className="max-w-full truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      className={`flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition lg:justify-start ${
        isActive
          ? "bg-white/12 text-white shadow-[inset_3px_0_0_#ff5a00,0_10px_24px_rgba(0,0,0,0.12)] ring-1 ring-white/10"
          : "text-white/72 hover:bg-white/10 hover:text-white"
      }`}
      href={href}
    >
      <span
        className={`flex size-8 items-center justify-center rounded-lg ${
          isActive ? "bg-copper text-white" : "bg-white/10 text-white/80"
        }`}
      >
        <Icon aria-hidden="true" size={17} />
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-center gap-2 lg:justify-start">
        {item.label}
        {isLocked ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-copper/20 px-2 py-0.5 text-[11px] font-bold text-white">
            <Lock aria-hidden="true" size={11} />
            Elite
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export async function AppShell({ active, children, plan }: AppShellProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, plan, role")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const email = user?.email ?? "";
  const isAdminUser = hasAdminAccess(profile?.role, email);
  const effectivePlan = isAdminUser ? "admin" : profile?.plan ?? plan;
  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdminUser,
  );
  const displayName = profile?.full_name ?? email;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(255,90,0,0.08),transparent_26rem),linear-gradient(135deg,#edf4fa,#f7fbff)] text-ink">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <aside className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_100%_0%,rgba(255,90,0,0.18),transparent_21rem),linear-gradient(180deg,#06233f,#021426)] px-5 py-5 text-white shadow-[16px_0_45px_rgba(7,26,46,0.12)] lg:sticky lg:top-0 lg:block lg:min-h-screen lg:w-72 lg:px-6 lg:py-6">
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rotate-45 bg-copper/90" />
          <div className="pointer-events-none absolute bottom-24 left-8 text-[18rem] font-black leading-none text-white/[0.025]">
            T
          </div>

          <div className="relative border-b border-white/10 pb-5">
            <TradioLogo />
          </div>

          <nav className="relative mt-6 flex flex-col gap-2">
            {visibleNavItems.map((item) => (
              <NavLink
                active={active}
                effectivePlan={effectivePlan}
                item={item}
                key={item.label}
              />
            ))}
          </nav>

          <form action={logout} className="relative mt-7">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-bold text-white transition hover:border-copper/60 hover:bg-white/10 lg:justify-start">
              <LogOut aria-hidden="true" size={17} />
              Log out
            </button>
          </form>

          <div className="relative mt-8 rounded-lg border border-white/10 bg-white/[0.07] p-4 text-sm text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <p className="font-semibold text-white">Workspace</p>
            <p className="mt-1 leading-6">
              Customers, quotes, invoices, and business details in one place.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 pb-20 lg:pb-0">
          {user ? (
            <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#123555] bg-[linear-gradient(135deg,#06233f,#03182d)] px-4 py-3 text-white shadow-sm lg:hidden">
              <Link className="flex min-w-0 items-center gap-3" href="/dashboard">
                <TradioLogo className="scale-75 origin-left" />
              </Link>
              <AccountMenu
                email={email}
                initials={initialsFor(displayName)}
                name={profile?.full_name}
                planLabel={planLabelFor(profile?.plan ?? plan, profile?.role)}
              />
            </div>
          ) : null}

          {user ? (
            <div className="sticky top-0 z-20 hidden justify-end border-b border-[#dce7f1] bg-white/90 px-5 py-3 shadow-[0_10px_26px_rgba(7,26,46,0.04)] backdrop-blur sm:px-8 lg:flex">
              <AccountMenu
                email={email}
                initials={initialsFor(displayName)}
                name={profile?.full_name}
                planLabel={planLabelFor(profile?.plan ?? plan, profile?.role)}
              />
            </div>
          ) : null}
          {children}

          {user ? (
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[linear-gradient(135deg,#06233f,#03182d)] px-2 py-2 shadow-[0_-18px_40px_rgba(7,26,46,0.18)] lg:hidden">
              <div className="flex gap-1 overflow-x-auto">
                {visibleNavItems.map((item) => (
                  <NavLink
                    active={active}
                    effectivePlan={effectivePlan}
                    item={item}
                    key={item.label}
                    mobile
                  />
                ))}
              </div>
            </nav>
          ) : null}
        </section>
      </div>
    </main>
  );
}
