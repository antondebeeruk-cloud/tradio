import { Check, Clock, CreditCard, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  startFreeTrial,
  startPayPalCheckout,
} from "@/app/pricing/actions";
import { TradioLogo } from "@/components/tradio-logo";
import { hasActiveSubscription } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Choose Package",
  robots: {
    follow: false,
    index: false,
  },
};

type PricingPageProps = {
  searchParams: {
    message?: string;
  };
};

const packages = [
  {
    action: startFreeTrial,
    button: "Start free trial",
    description: "Try Tradio for 10 days. No card or PayPal payment required.",
    icon: Clock,
    name: "Free Trial",
    price: "10 days free",
    value: "trial",
  },
  {
    button: "Continue with Lite",
    description: "For sole traders who want access to every Tradio module.",
    icon: CreditCard,
    name: "Lite",
    price: "£5.99/month",
    value: "lite",
  },
  {
    button: "Continue with Elite",
    description: "For growing trade businesses that want the full workflow.",
    featured: true,
    icon: ShieldCheck,
    name: "Elite",
    price: "£15.99/month",
    value: "elite",
  },
];

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/pricing");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, role, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (hasActiveSubscription(profile)) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-mist px-5 py-8 text-ink sm:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <TradioLogo className="justify-center" dark />
          <p className="eyebrow mt-8">Choose your package</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Start with a trial or unlock Tradio with PayPal.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Pick a plan before entering the dashboard. You can start free for 10
            days, or subscribe to Lite or Elite monthly.
          </p>
        </div>

        {searchParams.message ? (
          <p className="notice mx-auto mt-6 max-w-2xl text-center">
            {searchParams.message}
          </p>
        ) : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
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
                      Popular
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-5 text-xl font-semibold">{plan.name}</h2>
                <p className="mt-2 text-3xl font-semibold">{plan.price}</p>
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">
                  {plan.description}
                </p>

                <ul className="mt-5 space-y-3 text-sm text-slate-600">
                  {[
                    "Customer management",
                    "Quotes and invoices",
                    "Leads, jobs, and receipts",
                    "Reports",
                    "PDF exports",
                    "Email customer documents",
                  ].map((feature) => (
                    <li className="flex items-center gap-2" key={feature}>
                      <Check aria-hidden="true" className="text-copper" size={16} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <form
                  action={plan.value === "trial" ? plan.action : startPayPalCheckout}
                  className="mt-6"
                >
                  {plan.value !== "trial" ? (
                    <input name="plan" type="hidden" value={plan.value} />
                  ) : null}
                  <button
                    className={`w-full ${
                      plan.featured ? "btn-accent" : "btn-primary"
                    }`}
                  >
                    {plan.button}
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
