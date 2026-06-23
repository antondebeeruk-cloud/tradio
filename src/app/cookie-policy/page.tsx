import Image from "next/image";

export default function CookiePolicyPage() {
  return (
    <main className="bg-mist px-5 py-10 text-ink sm:px-8">
      <article className="mx-auto max-w-3xl rounded-lg border border-field bg-white p-6 shadow-sm sm:p-8">
        <Image
          alt="Tradio"
          className="mb-8 h-20 w-48 object-contain"
          height={160}
          src="/tradio-logo.png"
          width={240}
        />
        <p className="eyebrow">Legal placeholder</p>
        <h1 className="mt-3 text-3xl font-semibold">Cookie Policy</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          This cookie policy explains the current Tradio preference banner. It
          should be reviewed by a solicitor before launch.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-slate-600">
          <section>
            <h2 className="text-base font-semibold text-ink">Essential cookies</h2>
            <p className="mt-2">
              Essential cookies keep the app working, including login sessions
              and security. These are always allowed.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink">
              Analytics and marketing cookies
            </h2>
            <p className="mt-2">
              Analytics and marketing cookies are off by default. Tradio should
              only load them after a user accepts or saves preferences that
              allow them.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink">Changing preferences</h2>
            <p className="mt-2">
              The cookie banner stores the user&apos;s choice in the browser.
              Future versions can add an account setting to reset preferences.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink">Solicitor review needed</h2>
            <p className="mt-2">
              Replace this placeholder with the final cookie list, retention
              periods, third-party tools, and company contact details.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
