import type { Metadata } from "next";
import { TradioLogo } from "@/components/tradio-logo";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of Use placeholder for Tradio, a SaaS app for UK tradespeople.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <main className="bg-mist px-5 py-10 text-ink sm:px-8">
      <article className="mx-auto max-w-3xl rounded-lg border border-field bg-white p-6 shadow-sm sm:p-8">
        <TradioLogo className="mb-8" dark />
        <p className="eyebrow">Legal placeholder</p>
        <h1 className="mt-3 text-3xl font-semibold">Terms of Use</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          These terms are a starter placeholder. They need solicitor review
          before Tradio is offered to paying customers.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-slate-600">
          <section>
            <h2 className="text-base font-semibold text-ink">Using Tradio</h2>
            <p className="mt-2">
              Users are responsible for the customer data, quotes, invoices,
              job records, tax details, and business information they add to the
              app.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink">Subscriptions</h2>
            <p className="mt-2">
              Paid plans are billed through PayPal. Pricing, cancellation, and
              access rules should match the published pricing page and final
              subscription terms.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink">Documents</h2>
            <p className="mt-2">
              Tradio helps create professional PDFs, but users should check
              quotes, invoices, VAT details, payment terms, and customer
              information before sending them.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink">Solicitor review needed</h2>
            <p className="mt-2">
              Replace this placeholder with final company details, payment
              terms, acceptable use terms, limitation of liability, termination
              rules, and jurisdiction wording.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
