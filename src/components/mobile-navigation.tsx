"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  FileText,
  Fuel,
  LayoutDashboard,
  Lock,
  MailPlus,
  Menu,
  MessageCircleQuestion,
  ReceiptText,
  Settings,
  ShoppingCart,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type MobileNavigationItem = {
  active: boolean;
  href: string;
  label: string;
  locked: boolean;
  requiredPlan?: string;
};

const primaryHrefs = [
  "/dashboard",
  "/dashboard/leads",
  "/dashboard/jobs",
  "/invoices",
];

const iconByHref = {
  "/customers": UsersRound,
  "/dashboard": LayoutDashboard,
  "/dashboard/calendar": CalendarDays,
  "/dashboard/fuel-log": Fuel,
  "/dashboard/jobs": BriefcaseBusiness,
  "/dashboard/leads": MailPlus,
  "/dashboard/purchase-orders": ShoppingCart,
  "/dashboard/receipts": ReceiptText,
  "/dashboard/recurring": CalendarClock,
  "/dashboard/reports": BarChart3,
  "/dashboard/support": MessageCircleQuestion,
  "/dashboard/team": Users,
  "/invoices": ReceiptText,
  "/quotes": FileText,
  "/settings": Settings,
} as const;

function MobileTab({ item }: { item: MobileNavigationItem }) {
  const Icon = iconByHref[item.href as keyof typeof iconByHref] ?? FileText;

  return (
    <Link
      aria-current={item.active ? "page" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-bold transition ${
        item.active
          ? "bg-copper text-white shadow-sm"
          : "text-white hover:bg-white/10"
      }`}
      href={item.href}
    >
      <span className="relative">
        <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
        {item.locked ? (
          <Lock
            aria-hidden="true"
            className="absolute -right-2 -top-1 rounded-full bg-[#06233f] text-copper"
            size={12}
          />
        ) : null}
      </span>
      <span className="w-full truncate text-center">{item.label}</span>
    </Link>
  );
}

export function MobileNavigation({ items }: { items: MobileNavigationItem[] }) {
  const [open, setOpen] = useState(false);
  const primaryItems = primaryHrefs
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is MobileNavigationItem => Boolean(item));
  const moreItems = items.filter((item) => !primaryHrefs.includes(item.href));
  const moreIsActive = moreItems.some((item) => item.active);

  return (
    <>
      {open ? (
        <>
          <button
            aria-label="Close navigation menu"
            className="fixed inset-0 z-40 bg-ink/45 lg:hidden"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div
            aria-label="More Tradio modules"
            className="fixed inset-x-3 z-50 max-h-[62vh] overflow-y-auto rounded-lg border border-white/10 bg-[#06233f] p-3 text-white shadow-[0_-24px_70px_rgba(3,20,38,0.38)] lg:hidden"
            role="dialog"
            style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-2 pb-3">
              <div>
                <p className="font-black">All modules</p>
                <p className="mt-0.5 text-xs text-white/65">Open any part of Tradio</p>
              </div>
              <button
                aria-label="Close menu"
                className="flex size-10 items-center justify-center rounded-lg bg-white/10 text-white"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {moreItems.map((item) => {
                const Icon = iconByHref[item.href as keyof typeof iconByHref] ?? FileText;
                return (
                  <Link
                    className={`flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold ${
                      item.active ? "bg-copper text-white" : "bg-white/[0.08] text-white"
                    }`}
                    href={item.href}
                    key={item.href}
                    onClick={() => setOpen(false)}
                  >
                    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <Icon aria-hidden="true" size={17} />
                      {item.locked ? (
                        <Lock aria-hidden="true" className="absolute -right-1 -top-1 text-copper" size={11} />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{item.label}</span>
                      {item.locked ? (
                        <span className="block text-[10px] text-white/65">{item.requiredPlan}</span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[linear-gradient(135deg,#06233f,#03182d)] px-2 pt-2 shadow-[0_-18px_40px_rgba(7,26,46,0.2)] lg:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-lg gap-1">
          {primaryItems.map((item) => (
            <MobileTab item={item} key={item.href} />
          ))}
          <button
            aria-expanded={open}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-bold transition ${
              open || moreIsActive
                ? "bg-copper text-white shadow-sm"
                : "text-white hover:bg-white/10"
            }`}
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            <Menu aria-hidden="true" size={20} strokeWidth={2.2} />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
