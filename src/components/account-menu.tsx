import { ChevronDown, CreditCard, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/auth/actions";

type AccountMenuProps = {
  email: string;
  initials: string;
  name?: string | null;
  planLabel: string;
};

export function AccountMenu({ email, initials, name, planLabel }: AccountMenuProps) {
  const displayName = name || email;

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg border border-field bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-forest/20">
        <span className="flex size-9 items-center justify-center rounded-full bg-forest text-xs font-bold uppercase text-white">
          {initials}
        </span>
        <span className="hidden max-w-48 truncate text-left sm:block">{displayName}</span>
        <ChevronDown aria-hidden="true" className="text-slate-500 transition group-open:rotate-180" size={16} />
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-lg border border-field bg-white shadow-soft">
        <div className="border-b border-field px-4 py-3">
          <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{email}</p>
        </div>
        <Link className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-mist" href="/dashboard/account">
          <UserRound aria-hidden="true" size={16} />
          Account
        </Link>
        <Link className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-mist" href="/dashboard/account">
          <CreditCard aria-hidden="true" size={16} />
          Current subscription: {planLabel}
        </Link>
        <Link className="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-mist" href="/pricing">
          Manage subscription
        </Link>
        <Link className="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-mist" href="/dashboard/account#cancel-subscription">
          Cancel subscription
        </Link>
        <form action={logout} className="border-t border-field">
          <button className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-mist">
            <LogOut aria-hidden="true" size={16} />
            Log out
          </button>
        </form>
      </div>
    </details>
  );
}
