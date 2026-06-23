import {
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
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
    <main className="min-h-screen bg-mist text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col lg:flex-row">
        <aside className="border-b border-[#123555] bg-forest px-5 py-4 text-white shadow-sm lg:sticky lg:top-0 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-6 lg:py-6">
          <div className="rounded-lg border border-white/10 bg-white p-3 shadow-sm">
            <Image
              alt="Tradio"
              className="h-20 w-full object-contain"
              height={160}
              src="/tradio-logo.png"
              width={220}
            />
          </div>

          <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5 lg:mt-8 lg:flex lg:flex-col">
            {navItems.map((item) => {
              const isLocked = item.eliteOnly && effectivePlan === "lite";
              const href = isLocked
                ? `/pricing?message=${encodeURIComponent(eliteUpgradeMessage)}`
                : item.href;
              const isActive =
                (active === "dashboard" && item.href === "/dashboard") ||
                (active === "customers" && item.href === "/customers") ||
                (active === "quotes" && item.href === "/quotes") ||
                (active === "invoices" && item.href === "/invoices") ||
                (active === "reports" && item.href === "/dashboard/reports") ||
                (active === "jobs" && item.href === "/dashboard/jobs") ||
                (active === "settings" && item.href === "/settings");

              return (
                <Link
                  className={`flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition lg:justify-start ${
                    isActive
                      ? "bg-copper text-white shadow-sm"
                      : "text-white/78 hover:bg-white/10 hover:text-white"
                  }`}
                  href={href}
                  key={item.label}
                >
                  <item.icon aria-hidden="true" size={18} />
                  <span className="flex min-w-0 flex-1 items-center justify-center gap-2 lg:justify-start">
                    {item.label}
                    {isLocked ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white">
                        <Lock aria-hidden="true" size={11} />
                        Elite
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </nav>

          <form action={logout} className="mt-5 lg:mt-8">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 lg:justify-start">
              <LogOut aria-hidden="true" size={17} />
              Log out
            </button>
          </form>

          <div className="mt-8 hidden rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70 lg:block">
            <p className="font-semibold text-white">Workspace</p>
            <p className="mt-1 leading-6">
              Customers, quotes, invoices, and business details in one place.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          {user ? (
            <div className="sticky top-0 z-20 flex justify-end border-b border-field bg-mist/95 px-5 py-3 backdrop-blur sm:px-8">
              <AccountMenu
                email={email}
                initials={initialsFor(displayName)}
                name={profile?.full_name}
                planLabel={planLabelFor(profile?.plan ?? plan, profile?.role)}
              />
            </div>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}
