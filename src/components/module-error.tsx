"use client";

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { tradioModules, type TradioModuleId } from "@/lib/modules";

export function ModuleError({
  moduleId,
  reset,
}: {
  moduleId: TradioModuleId;
  reset: () => void;
}) {
  const moduleDefinition = tradioModules[moduleId];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#edf4fa] px-5 py-12 text-ink">
      <section className="surface w-full max-w-lg p-7 text-center sm:p-10">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#fff0e7] text-copper">
          <AlertTriangle aria-hidden="true" size={24} />
        </div>
        <p className="eyebrow mt-5">Module temporarily unavailable</p>
        <h1 className="mt-2 text-2xl font-semibold">
          {moduleDefinition.label} needs a moment.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The rest of Tradio is still available. Try this module again, or return
          to Overview and continue working elsewhere.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button className="btn-accent" onClick={reset} type="button">
            <RefreshCw aria-hidden="true" size={17} />
            Try again
          </button>
          <Link className="btn-secondary" href="/dashboard">
            <ArrowLeft aria-hidden="true" size={17} />
            Back to Overview
          </Link>
        </div>
      </section>
    </main>
  );
}
