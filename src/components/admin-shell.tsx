import Link from "next/link";
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { adminLogout } from "@/app/admin/login/actions";
import { TradioLogo } from "@/components/tradio-logo";

type AdminShellProps = {
  active?: "accounts" | "overview";
  children: React.ReactNode;
  email?: string | null;
};

export function AdminShell({
  active = "overview",
  children,
  email,
}: AdminShellProps) {
  const navClass = (item: AdminShellProps["active"]) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
      active === item
        ? "bg-white/15 text-white"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-mist text-ink lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="bg-[#061d34] px-5 py-5 text-white lg:min-h-screen">
        <div className="flex items-center justify-between lg:block">
          <TradioLogo className="[&>img]:!h-10 [&>img]:!w-10 [&>span]:!text-[1.9rem]" />
          <span className="rounded-md bg-copper px-2 py-1 text-[10px] font-black uppercase tracking-normal lg:mt-4 lg:inline-flex">
            Admin
          </span>
        </div>

        <nav className="mt-6 grid gap-1 sm:grid-cols-3 lg:mt-8 lg:grid-cols-1">
          <Link className={navClass("overview")} href="/admin">
            <LayoutDashboard aria-hidden="true" size={18} />
            Overview
          </Link>
          <Link className={navClass("accounts")} href="/admin#accounts">
            <UsersRound aria-hidden="true" size={18} />
            Accounts
          </Link>
          <Link
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            href="https://tradio.uk"
          >
            <ExternalLink aria-hidden="true" size={18} />
            Open Tradio
          </Link>
        </nav>

        <div className="mt-6 border-t border-white/10 pt-5 lg:mt-10">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-orange-300">
              <ShieldCheck aria-hidden="true" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white">Administrator</p>
              <p className="truncate text-xs text-slate-400">{email}</p>
            </div>
          </div>
          <form action={adminLogout} className="mt-4">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
              <LogOut aria-hidden="true" size={18} />
              Log out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0">{children}</main>
    </div>
  );
}

