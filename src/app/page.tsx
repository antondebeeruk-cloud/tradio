import {
  ArrowRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Check,
  Clock,
  FileText,
  MailPlus,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { TradioLogo } from "@/components/tradio-logo";

const features = [
  {
    description:
      "Keep customer details, notes, phone numbers, addresses, and lead history in one place.",
    icon: UsersRound,
    title: "Manage customers",
  },
  {
    description:
      "Create clean quotes with line items, VAT, totals, statuses, and professional PDF exports.",
    icon: FileText,
    title: "Create quotes",
  },
  {
    description:
      "Turn accepted quotes into invoices, track unpaid work, and mark invoices as paid.",
    icon: ReceiptText,
    title: "Send invoices",
  },
  {
    description:
      "Use your Tradio lead email on Bark, Checkatrade, MyBuilder, Facebook, and more.",
    icon: MailPlus,
    title: "Capture leads",
  },
  {
    description:
      "Elite users can track jobs from enquiry through completion with dates, notes, and status.",
    icon: BriefcaseBusiness,
    title: "Track jobs",
  },
  {
    description:
      "See recent quotes, paid invoices, unpaid value, revenue, and quote conversion rate.",
    icon: BarChart3,
    title: "Reports",
  },
  {
    description:
      "Ask Tradio Support AI for quick help with setup, quotes, invoices, leads, subscriptions, and common app questions.",
    icon: Bot,
    title: "AI support",
  },
];

const plans = [
  {
    description: "Try Tradio with no payment required.",
    name: "Free Trial",
    price: "10 days free",
    points: ["No card needed", "Quotes and invoices", "Lead inbox", "Elite features during trial"],
  },
  {
    description: "For sole traders who need the core workflow.",
    name: "Lite",
    price: "£5.99/month",
    points: ["Customers", "Quotes", "Invoices", "PDF and email export"],
  },
  {
    description: "For growing trade businesses that want everything.",
    featured: true,
    name: "Elite",
    price: "£15.99/month",
    points: ["Everything in Lite", "Reports", "Job tracking", "Full trial upgrade path"],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#061d34] text-white">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_20%,rgba(255,90,0,0.42),transparent_22rem),linear-gradient(135deg,#06233f_0%,#031426_58%,#ff5a00_160%)]" />
        <div className="absolute right-[-7rem] top-[-8rem] -z-10 h-80 w-80 rotate-45 bg-copper" />
        <div className="absolute bottom-10 right-14 -z-10 hidden text-[24rem] font-black leading-none text-white/[0.035] lg:block">
          T
        </div>

        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/">
            <TradioLogo />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              className="hidden rounded-lg px-4 py-2.5 text-sm font-bold text-white/82 transition hover:bg-white/10 hover:text-white sm:inline-flex"
              href="/login"
            >
              Log in
            </Link>
            <Link className="btn-accent" href="/signup">
              Start free
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </nav>
        </header>

        <div className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-10 px-5 pb-14 pt-6 sm:px-8 lg:grid-cols-[0.94fr_1.06fr] lg:pb-20">
          <div className="max-w-3xl">
            <p className="eyebrow text-white">Quotes. Invoices. Jobs. Sorted.</p>
            <h1 className="mt-5 text-4xl font-black leading-[1.04] tracking-normal text-white sm:text-6xl">
              The simple way for tradespeople to run their business.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              Tradio helps plumbers, electricians, gardeners, cleaners,
              builders, and handymen capture leads, manage customers, send
              polished quotes, convert invoices, and stay organised.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="btn-accent" href="/signup">
                Create account
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
              <Link
                className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white hover:text-ink"
                href="/login?redirectedFrom=/dashboard/support"
              >
                Ask AI support
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {["Professional PDFs", "Lead email inbox", "Reports and jobs"].map(
                (item) => (
                  <div
                    className="rounded-lg border border-white/12 bg-white/[0.07] px-4 py-3 text-sm font-bold text-white"
                    key={item}
                  >
                    <Check
                      aria-hidden="true"
                      className="mb-2 text-copper"
                      size={18}
                    />
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-8 -top-8 h-32 w-32 rotate-45 bg-copper" />
            <div className="relative overflow-hidden rounded-lg border border-white/16 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between border-b border-field px-5 py-4">
                <div>
                  <p className="text-sm font-black text-ink">Dashboard</p>
                  <p className="mt-1 text-xs text-slate-500">Acme Plumbing</p>
                </div>
                <span className="status-pill bg-[#e7f7ef] text-[#177a55]">
                  Paid
                </span>
              </div>
              <div className="grid gap-4 bg-[#f4f7fb] p-5 sm:grid-cols-3">
                {[
                  ["Quotes", "12"],
                  ["Invoices", "8"],
                  ["Outstanding", "£3,240"],
                ].map(([label, value]) => (
                  <div className="rounded-lg bg-white p-4 shadow-sm" key={label}>
                    <p className="text-xs font-bold text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-black text-ink">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 p-5 lg:grid-cols-2">
                <div className="rounded-lg border border-field bg-white">
                  <div className="border-b border-field px-4 py-3">
                    <p className="text-sm font-black text-ink">Recent quotes</p>
                  </div>
                  {["QT-1007 Bathroom install", "QT-1006 Garden clearance", "QT-1005 Rewire"].map(
                    (item, index) => (
                      <div
                        className="flex items-center justify-between border-b border-field px-4 py-3 text-xs last:border-b-0"
                        key={item}
                      >
                        <span className="font-bold text-ink">{item}</span>
                        <span
                          className={`status-pill ${
                            index === 0
                              ? "bg-[#e7f7ef] text-[#177a55]"
                              : "bg-field text-forest"
                          }`}
                        >
                          {index === 0 ? "Accepted" : "Sent"}
                        </span>
                      </div>
                    ),
                  )}
                </div>
                <div className="rounded-lg border border-field bg-white">
                  <div className="border-b border-field px-4 py-3">
                    <p className="text-sm font-black text-ink">Lead inbox</p>
                  </div>
                  {["Bark", "Checkatrade", "Facebook"].map((item) => (
                    <div
                      className="flex items-center justify-between border-b border-field px-4 py-3 text-xs last:border-b-0"
                      key={item}
                    >
                      <span className="font-bold text-ink">{item} enquiry</span>
                      <span className="text-slate-500">New</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 text-ink sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="eyebrow">What Tradio does</p>
            <h2 className="page-title">
              Everything a trade business needs before the job, during the job,
              and after the invoice.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <article className="surface-pad" key={feature.title}>
                <div className="flex size-11 items-center justify-center rounded-lg bg-[#fff1e8] text-copper">
                  <feature.icon aria-hidden="true" size={22} />
                </div>
                <h3 className="mt-5 text-lg font-black">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-16 text-ink sm:px-8">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-lg border border-field bg-[linear-gradient(135deg,#06233f,#031426)] shadow-soft lg:grid-cols-[0.88fr_1.12fr]">
          <div className="relative p-6 text-white sm:p-8">
            <div className="absolute -right-12 -top-12 h-32 w-32 rotate-45 bg-copper" />
            <div className="relative flex size-12 items-center justify-center rounded-lg bg-white/10 text-copper ring-1 ring-white/15">
              <Bot aria-hidden="true" size={25} />
            </div>
            <p className="relative mt-6 text-sm font-black uppercase tracking-[0.16em] text-copper">
              Built-in help
            </p>
            <h2 className="relative mt-3 text-3xl font-black leading-tight">
              Support AI is ready when trades get busy.
            </h2>
            <p className="relative mt-4 max-w-xl text-sm leading-7 text-white/76">
              Users can ask how to create quotes, convert invoices, manage
              lead emails, check subscriptions, or solve common setup issues
              without leaving Tradio.
            </p>
            <Link
              className="btn-accent relative mt-6"
              href="/login?redirectedFrom=/dashboard/support"
            >
              Open support AI
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>

          <div className="grid gap-3 bg-[#f4f7fb] p-5 sm:p-8">
            {[
              "How do I create and send a quote?",
              "Why are leads not showing from my mailbox?",
              "How do I convert a quote into an invoice?",
            ].map((question, index) => (
              <div
                className="rounded-lg border border-field bg-white p-4 shadow-sm"
                key={question}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                      index === 1
                        ? "bg-[#fff1e8] text-copper"
                        : "bg-[#e7f0f8] text-forest"
                    }`}
                  >
                    {index === 1 ? (
                      <Bot aria-hidden="true" size={18} />
                    ) : (
                      <Check aria-hidden="true" size={18} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-ink">{question}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Tradio Support AI gives a short, step-by-step answer
                      based on the app workflow.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#edf4fa,#ffffff)] px-5 py-16 text-ink sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Packages</p>
              <h2 className="page-title">Start free, then choose your setup.</h2>
            </div>
            <Link className="btn-primary" href="/signup">
              Choose package
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                className={`surface-pad flex flex-col ${
                  plan.featured ? "border-copper shadow-soft" : ""
                }`}
                key={plan.name}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black">{plan.name}</h3>
                  {plan.featured ? (
                    <span className="status-pill bg-[#fff0e7] text-[#d94800]">
                      Popular
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-3xl font-black">{plan.price}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {plan.description}
                </p>
                <ul className="mt-5 space-y-3 text-sm text-slate-600">
                  {plan.points.map((point) => (
                    <li className="flex items-center gap-2" key={point}>
                      <Check aria-hidden="true" className="text-copper" size={16} />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#061d34] px-5 py-14 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Clock aria-hidden="true" className="text-copper" size={22} />
              <p className="text-sm font-black uppercase tracking-[0.12em] text-white/70">
                10 days free
              </p>
            </div>
            <h2 className="mt-3 text-3xl font-black">
              Try Tradio without payment.
            </h2>
          </div>
          <Link className="btn-accent" href="/signup">
            Start now
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
