import { Check, Clock, CreditCard, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  startFreeTrial,
  startPayPalCheckout,
} from "@/app/pricing/actions";
import { TradioLogo } from "@/components/tradio-logo";
import { hasActiveSubscription } from "@/lib/subscription";
import { createPersonalClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Choose Package",
  robots: { follow: false, index: false },
};

type PricingPageProps = {
  searchParams: Promise<{ message?: string }>;
};

const packages = [
  {
    button: "Start free trial",
    description: "Try every Tradio feature for 14 days. No payment required.",
    features: ["No card required", "All Elite features", "Cancel anytime"],
    icon: Clock,
    name: "Free Trial",
    price: "14 days free",
    value: "trial",
  },
  {
    annualPrice: "\u00a399/year",
    description: "Run your jobs. Perfect for sole traders getting started.",
    features: [
      "Customer and lead management",
      "Quotes and invoices",
      "Job management",
      "Basic expenses",
      "Mobile-ready app",
      "Email support",
      "1 user",
    ],
    icon: CreditCard,
    monthlyPrice: "\u00a39.99/month",
    name: "Lite",
    value: "lite",
  },
  {
    annualPrice: "\u00a3199/year",
    description: "Run your business. Built for busy self-employed tradespeople.",
    features: [
      "Everything in Lite",
      "Supplier invoices and receipt scans",
      "Job notes and photos",
      "Profit per job",
      "PDF exports",
      "Priority support",
      "2 users included",
    ],
    featured: true,
    icon: ShieldCheck,
    monthlyPrice: "\u00a319.99/month",
    name: "Pro",
    value: "pro",
  },
  {
    annualPrice: "\u00a3349/year",
    description: "Grow your business with advanced reporting and insight.",
    features: [
      "Everything in Pro",
      "Advanced reports",
      "Quote conversion and outstanding payments",
      "Profit, material spend, and VAT reports",
      "Time vs money analysis",
      "AI support tools",
      "Unlimited users",
    ],
    icon: ShieldCheck,
    monthlyPrice: "\u00a334.99/month",
    name: "Elite",
    value: "elite",
  },
];

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const search = await searchParams;
  const supabase = await createPersonalClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/pricing");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();
  const hasSubscription = hasActiveSubscription(profile);
  const trialUsed = profile?.plan === "trial";

  return (
    <main className="min-h-screen bg-mist px-5 py-8 text-ink sm:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <TradioLogo className="justify-center" dark />
          <p className="eyebrow mt-8">Choose your package</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Start free, then choose how you want to grow.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Try Tradio free for 14 days, or choose Lite, Pro, or Elite with
            monthly or annual billing. Cancel anytime.
          </p>
        </div>

        {search.message ? (
          <p className="notice mx-auto mt-6 max-w-2xl text-center">
            {search.message}
          </p>
        ) : null}
        {hasSubscription ? (
          <p className="notice mx-auto mt-6 max-w-2xl text-center">
            Current plan: {profile?.plan}. Choose another package below to
            change your subscription.
          </p>
        ) : null}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {packages.map((plan) => {
            const Icon = plan.icon;

            return (
              <article
                className={`surface-pad flex flex-col ${
                  plan.featured ? "border-copper shadow-soft" : ""
                }`}
                key={plan.name}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-field text-forest">
                    <Icon aria-hidden="true" size={22} />
                  </div>
                  {plan.featured ? (
                    <span className="status-pill bg-[#fff0e7] text-[#d94800]">
                      Most popular
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-5 text-xl font-semibold">{plan.name}</h2>
                <p className="mt-2 text-3xl font-semibold">
                  {plan.value === "trial" ? plan.price : plan.monthlyPrice}
                </p>
                {plan.annualPrice ? (
                  <p className="mt-1 text-sm font-semibold text-[#177a55]">
                    {plan.annualPrice} with annual billing
                  </p>
                ) : null}
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">
                  {plan.description}
                </p>
                <ul className="mt-5 flex-1 space-y-3 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li className="flex items-start gap-2" key={feature}>
                      <Check
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-copper"
                        size={16}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.value === "trial" ? (
                  <form action={startFreeTrial} className="mt-6">
                    <button
                      className="btn-primary w-full"
                      disabled={hasSubscription || trialUsed}
                    >
                      {hasSubscription || trialUsed
                        ? "Trial unavailable"
                        : plan.button}
                    </button>
                  </form>
                ) : (
                  <div className="mt-6 grid gap-2">
                    <form action={startPayPalCheckout}>
                      <input name="plan" type="hidden" value={plan.value} />
                      <input
                        name="billing_interval"
                        type="hidden"
                        value="monthly"
                      />
                      <button
                        className={`w-full ${
                          plan.featured ? "btn-accent" : "btn-primary"
                        }`}
                      >
                        Choose monthly
                      </button>
                    </form>
                    <form action={startPayPalCheckout}>
                      <input name="plan" type="hidden" value={plan.value} />
                      <input
                        name="billing_interval"
                        type="hidden"
                        value="annual"
                      />
                      <button className="btn-secondary w-full">
                        Choose annual and save 20%
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
