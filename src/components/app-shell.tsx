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
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { AccountMenu } from "@/components/account-menu";
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
          ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
          : "text-white/70 hover:bg-white/10 hover:text-white"
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
  const effectivePlan = profile?.role === "admin" ? "admin" : profile?.plan ?? plan;
  const email = user?.email ?? "";
  const displayName = profile?.full_name ?? email;

  return (
    <main className="min-h-screen bg-[#eef4f9] text-ink">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <aside className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(255,90,0,0.20),transparent_34%),linear-gradient(180deg,#06233f,#03182d)] px-5 py-5 text-white shadow-sm lg:sticky lg:top-0 lg:block lg:min-h-screen lg:w-72 lg:px-6 lg:py-6">
          <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rotate-45 bg-copper" />
          <div className="pointer-events-none absolute bottom-20 left-10 text-[18rem] font-black leading-none text-white/[0.025]">
            T
          </div>

          <div className="relative px-1 py-2">
            <Image
              alt="Tradio"
              className="h-20 w-full object-contain drop-shadow-sm"
              height={160}
              src="/tradio-logo.png"
              width={220}
            />
          </div>

          <nav className="relative mt-8 flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                active={active}
                effectivePlan={effectivePlan}
                item={item}
                key={item.label}
              />
            ))}
          </nav>

          <form action={logout} className="relative mt-8">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 lg:justify-start">
              <LogOut aria-hidden="true" size={17} />
              Log out
            </button>
          </form>

          <div className="relative mt-8 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70">
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
                <Image
                  alt="Tradio"
                  className="h-10 w-36 object-contain object-left drop-shadow-sm"
                  height={72}
                  src="/tradio-logo.png"
                  width={180}
                />
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
            <div className="sticky top-0 z-20 hidden justify-end border-b border-field bg-white/95 px-5 py-3 shadow-sm backdrop-blur sm:px-8 lg:flex">
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
                {navItems.map((item) => (
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
