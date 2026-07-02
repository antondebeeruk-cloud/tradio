import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-field bg-white px-5 py-6 text-sm text-slate-500 sm:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p>Tradio. Quotes, invoices, jobs. Sorted.</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link className="font-semibold text-forest hover:underline" href="/releases">
            Releases
          </Link>
          <Link className="font-semibold text-forest hover:underline" href="/privacy-policy">
            Privacy Policy
          </Link>
          <Link className="font-semibold text-forest hover:underline" href="/terms">
            Terms of Use
          </Link>
          <Link className="font-semibold text-forest hover:underline" href="/eula">
            EULA
          </Link>
          <Link className="font-semibold text-forest hover:underline" href="/cookie-policy">
            Cookie Policy
          </Link>
          <a className="font-semibold text-forest hover:underline" href="mailto:hello@tradio.uk">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
