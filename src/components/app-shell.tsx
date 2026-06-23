import {
  FileText,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/auth/actions";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Customers", href: "/customers", icon: UsersRound },
  { label: "Quotes", href: "/quotes", icon: FileText },
  { label: "Invoices", href: "/invoices", icon: ReceiptText },
  { label: "Settings", href: "/settings", icon: Settings },
];

type AppShellProps = {
  active: "dashboard" | "customers" | "quotes" | "invoices" | "settings";
  children: React.ReactNode;
};

export function AppShell({ active, children }: AppShellProps) {
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
              const isActive =
                (active === "dashboard" && item.href === "/dashboard") ||
                (active === "customers" && item.href === "/customers") ||
                (active === "quotes" && item.href === "/quotes") ||
                (active === "invoices" && item.href === "/invoices") ||
                (active === "settings" && item.href === "/settings");

              return (
                <Link
                  className={`flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition lg:justify-start ${
                    isActive
                      ? "bg-copper text-white shadow-sm"
                      : "text-white/78 hover:bg-white/10 hover:text-white"
                  }`}
                  href={item.href}
                  key={item.label}
                >
                  <item.icon aria-hidden="true" size={18} />
                  {item.label}
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

        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}
