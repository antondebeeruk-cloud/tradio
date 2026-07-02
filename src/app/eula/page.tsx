import Link from "next/link";
import type { Metadata } from "next";
import { TradioLogo } from "@/components/tradio-logo";

export const metadata: Metadata = {
  title: "End-User Licence Agreement",
  description: "The End-User Licence Agreement for the Tradio service and mobile apps.",
  alternates: {
    canonical: "/eula",
  },
};

const sections = [
  {
    title: "1. About this agreement",
    content: (
      <>
        This End-User Licence Agreement (the <strong>Agreement</strong>) is between
        you and Tradio. It governs your use of the Tradio website, mobile apps,
        software, and related services. The legal entity name, company number,
        and registered address for Tradio must be inserted following solicitor
        review and before this Agreement is treated as final.
      </>
    ),
  },
  {
    title: "2. Licence",
    content: (
      <>
        Subject to this Agreement and your selected plan, Tradio grants you a
        limited, non-exclusive, non-transferable, revocable licence to access and
        use the service for your own lawful trade or business activities. You do
        not acquire ownership of Tradio or its underlying software.
      </>
    ),
  },
  {
    title: "3. Accounts and authorised users",
    content: (
      <>
        You must provide accurate account information, keep login details secure,
        and tell us promptly if you suspect unauthorised access. You are
        responsible for activity carried out through your account and for making
        sure team members use Tradio in accordance with this Agreement.
      </>
    ),
  },
  {
    title: "4. Acceptable use",
    content: (
      <>
        You may use Tradio to manage legitimate business records, customers,
        leads, jobs, quotes, invoices, expenses, files, and reports. You must not
        use it unlawfully, infringe another person&apos;s rights, upload malicious
        code, attempt to bypass security, interfere with the service, scrape it,
        resell access without permission, or reverse engineer the software except
        where applicable law expressly permits this.
      </>
    ),
  },
  {
    title: "5. Your content and business records",
    content: (
      <>
        You retain ownership of the information and files you add to Tradio. You
        give us the limited permission needed to host, process, back up, display,
        and transmit that content to provide the service. You are responsible for
        having a lawful basis to store customer and employee information and for
        checking the accuracy of quotes, invoices, VAT figures, reports, and
        generated documents before relying on or sending them.
      </>
    ),
  },
  {
    title: "6. Third-party services",
    content: (
      <>
        Tradio may connect with services such as PayPal, Supabase, Xero, Sage,
        QuickBooks, email providers, maps, and app stores. Their own terms and
        privacy practices apply. We are not responsible for a third-party service,
        its availability, or changes it makes, although we will take reasonable
        care when operating Tradio integrations.
      </>
    ),
  },
  {
    title: "7. Mobile apps and device permissions",
    content: (
      <>
        Mobile features may request access to your camera, photos, files, or
        location only when needed for features you choose to use. You can manage
        permissions in your device settings, although disabling one may prevent
        the related feature from working. App-store terms may also apply.
      </>
    ),
  },
  {
    title: "8. Trials, subscriptions, and payment",
    content: (
      <>
        Access may depend on a free trial or paid subscription. Current prices,
        billing intervals, included features, cancellation options, and any limits
        are shown on the pricing and account pages. Paid access may stop after a
        failed payment, cancellation, or the end of a trial. Nothing in this
        Agreement removes rights that cannot lawfully be excluded.
      </>
    ),
  },
  {
    title: "9. Availability, changes, and support",
    content: (
      <>
        We aim to keep Tradio available and useful, but uninterrupted or error-free
        operation is not guaranteed. We may maintain, secure, improve, replace, or
        discontinue features. Where a material change affects paid use, we will
        take reasonable steps to provide notice. Support is provided according to
        the plan and support information shown in Tradio.
      </>
    ),
  },
  {
    title: "10. Intellectual property",
    content: (
      <>
        Tradio, its software, designs, branding, documentation, and service content
        are owned by or licensed to us and are protected by intellectual property
        law. Third-party names and marks remain the property of their respective
        owners.
      </>
    ),
  },
  {
    title: "11. Suspension and termination",
    content: (
      <>
        You may stop using Tradio and cancel through the available account controls.
        We may suspend or end access where reasonably necessary for security,
        unlawful use, serious or repeated breach, non-payment, or protection of
        other users. Data export and deletion requests are handled through the
        account tools and our Privacy Policy, subject to lawful retention duties.
      </>
    ),
  },
  {
    title: "12. Responsibility and liability",
    content: (
      <>
        Tradio is a business administration tool and does not provide legal, tax,
        accounting, or financial advice. Any limitation of liability must be
        reviewed by a UK solicitor and will apply only to the extent permitted by
        law. Nothing in this Agreement excludes or limits liability for death or
        personal injury caused by negligence, fraud or fraudulent
        misrepresentation, or any other liability that cannot lawfully be limited.
      </>
    ),
  },
  {
    title: "13. Privacy",
    content: (
      <>
        Our <Link className="font-semibold text-copper hover:underline" href="/privacy-policy">Privacy Policy</Link>{" "}
        explains how personal information is handled, and our{" "}
        <Link className="font-semibold text-copper hover:underline" href="/cookie-policy">Cookie Policy</Link>{" "}
        explains the technologies used on the service. The{" "}
        <Link className="font-semibold text-copper hover:underline" href="/terms">Terms of Use</Link>{" "}
        also form part of the agreement governing your account.
      </>
    ),
  },
  {
    title: "14. Changes to this Agreement",
    content: (
      <>
        We may update this Agreement as Tradio develops or legal requirements
        change. We will publish the revised version and update its effective date.
        Material changes may require fresh acceptance before continued use.
      </>
    ),
  },
  {
    title: "15. Governing law and contact",
    content: (
      <>
        This draft is intended to be governed by the laws of England and Wales,
        with the appropriate courts having jurisdiction, subject to any mandatory
        rights that apply to you. This wording requires solicitor review. Questions
        can be sent to <a className="font-semibold text-copper hover:underline" href="mailto:hello@tradio.uk">hello@tradio.uk</a>.
      </>
    ),
  },
];

export default function EulaPage() {
  return (
    <main className="bg-mist px-5 py-10 text-ink sm:px-8">
      <article className="mx-auto max-w-3xl rounded-lg border border-field bg-white p-6 shadow-sm sm:p-8">
        <TradioLogo className="mb-8" dark />
        <p className="eyebrow">Legal agreement</p>
        <h1 className="mt-3 text-3xl font-semibold">End-User Licence Agreement</h1>
        <p className="mt-3 text-sm font-medium text-slate-500">
          Effective date: 2 July 2026
        </p>

        <div className="notice mt-6">
          <strong>Draft for solicitor review.</strong> This Agreement is a
          practical starting point and is not legal advice or a claim of full
          legal compliance.
        </div>

        <div className="mt-8 space-y-7 text-sm leading-6 text-slate-600">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-ink">{section.title}</h2>
              <p className="mt-2">{section.content}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
