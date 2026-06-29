import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  FlaskConical,
  History,
} from "lucide-react";
import { TradioLogo } from "@/components/tradio-logo";
import { currentRelease, tradioReleases } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Releases",
  description:
    "See what is new in Tradio, including the latest features, improvements and beta releases for UK tradespeople.",
  alternates: { canonical: "/releases" },
};

export default function ReleasesPage() {
  return (
    <main className="min-h-screen bg-mist text-ink">
      <header className="bg-[#061d34] px-5 py-5 text-white sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/">
            <TradioLogo className="[&>img]:!h-10 [&>img]:!w-10 [&>span]:!text-[1.9rem] sm:[&>img]:!h-12 sm:[&>img]:!w-12 sm:[&>span]:!text-[2.65rem]" />
          </Link>
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white"
            href="/"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Back to Tradio
          </Link>
        </div>
      </header>

      <section className="border-b border-field bg-white px-5 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-copper">
            <History aria-hidden="true" size={16} />
            Product releases
          </div>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">
                What&apos;s new in Tradio
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Every Tradio release will be recorded here with its new
                features, improvements and important changes.
              </p>
            </div>
            <div className="flex w-fit items-center gap-3 rounded-lg border border-orange-200 bg-[#fff5ef] px-4 py-3">
              <FlaskConical aria-hidden="true" className="text-copper" size={19} />
              <div>
                <p className="text-xs font-bold uppercase text-copper">Current release</p>
                <p className="mt-0.5 font-black">
                  Version {currentRelease.version} {currentRelease.status}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-12">
        {tradioReleases.map((release) => (
          <article
            className="overflow-hidden rounded-lg border border-field bg-white shadow-sm"
            key={release.version}
          >
            <div className="border-b border-field bg-[#071f37] p-5 text-white sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-black">
                      Version {release.version}
                    </h2>
                    <span className="rounded-md bg-copper px-2.5 py-1 text-xs font-black uppercase text-white">
                      {release.status}
                    </span>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
                    {release.summary}
                  </p>
                </div>
                <p className="flex shrink-0 items-center gap-2 text-sm text-slate-300">
                  <CalendarDays aria-hidden="true" size={16} />
                  {release.date}
                </p>
              </div>
            </div>

            <div className="grid gap-px bg-field md:grid-cols-2">
              {release.groups.map((group) => (
                <section className="bg-white p-5 sm:p-6" key={group.title}>
                  <h3 className="font-semibold text-ink">{group.title}</h3>
                  <ul className="mt-4 space-y-3">
                    {group.features.map((feature) => (
                      <li
                        className="flex items-start gap-3 text-sm leading-6 text-slate-600"
                        key={feature}
                      >
                        <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e7f7ef] text-[#177a55]">
                          <Check aria-hidden="true" size={13} strokeWidth={3} />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </article>
        ))}

        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center sm:p-8">
          <h2 className="font-semibold">More releases are on the way</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Beta feedback will shape the journey to Tradio 1.0. New releases
            will appear above this one, with a clear record of everything added.
          </p>
        </section>
      </div>
    </main>
  );
}

