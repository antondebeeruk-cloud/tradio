import Link from "next/link";
import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { signup } from "@/app/auth/actions";
import { TradioLogo } from "@/components/tradio-logo";

export const metadata: Metadata = {
  title: "Create Account",
  robots: {
    follow: false,
    index: false,
  },
};

type SignupPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const search = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-5 py-10 text-ink">
      <section className="surface-pad w-full max-w-md">
        <div className="rounded-lg border border-field bg-white p-4 text-center">
          <TradioLogo className="justify-center" dark />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Create your trade workspace
          </p>
        </div>

        <form action={signup} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-medium" htmlFor="fullName">
              Your name
            </label>
            <input
              className="field-control"
              id="fullName"
              name="fullName"
              type="text"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="businessName">
              Business name
            </label>
            <input
              className="field-control"
              id="businessName"
              name="businessName"
              type="text"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              className="field-control"
              id="email"
              name="email"
              required
              type="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              className="field-control"
              id="password"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </div>

          {search.message ? (
            <p className="notice">
              {search.message}
            </p>
          ) : null}

          <label className="flex items-start gap-3 text-sm leading-5 text-slate-600">
            <input
              className="mt-1 h-4 w-4 shrink-0 accent-copper"
              name="legalAcceptance"
              required
              type="checkbox"
              value="accepted"
            />
            <span>
              I agree to the{" "}
              <Link className="font-semibold text-copper hover:underline" href="/terms" target="_blank">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link className="font-semibold text-copper hover:underline" href="/eula" target="_blank">
                End-User Licence Agreement
              </Link>
              , and acknowledge the{" "}
              <Link className="font-semibold text-copper hover:underline" href="/privacy-policy" target="_blank">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <button className="btn-accent w-full py-2.5">
            <UserPlus aria-hidden="true" size={17} />
            Sign up
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link className="font-semibold text-copper hover:underline" href="/login">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
