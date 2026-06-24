import type { Metadata } from "next";
import { TradioLogo } from "@/components/tradio-logo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy placeholder for Tradio, a quote, invoice, lead, and job tracking app for UK tradespeople.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-mist px-5 py-10 text-ink sm:px-8">
      <article className="mx-auto max-w-3xl rounded-lg border border-field bg-white p-6 shadow-sm sm:p-8">
        <TradioLogo className="mb-8" dark />
        <p className="eyebrow">Legal placeholder</p>
        <h1 className="mt-3 text-3xl font-semibold">Privacy Policy</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          This page is a practical placeholder and should be reviewed by a UK
          solicitor before Tradio is used with real customers.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-slate-600">
          <section>
            <h2 className="text-base font-semibold text-ink">Information we collect</h2>
            <p className="mt-2">
              Tradio may store account details, customer records, quotes,
              invoices, job notes, business details, and subscription details
              needed to run the service.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink">How we use information</h2>
            <p className="mt-2">
              We use information to provide app features, keep accounts secure,
              prepare documents, support billing, and respond to user requests.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink">Your choices</h2>
            <p className="mt-2">
              Signed-in users can export their data, request account deletion,
              and manage subscription information from the account page.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink">Solicitor review needed</h2>
            <p className="mt-2">
              Replace this placeholder with a policy tailored to Tradio&apos;s
              final company details, processors, retention periods, lawful
              bases, support contact, and data protection processes.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
