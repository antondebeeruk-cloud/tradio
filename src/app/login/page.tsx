import Link from "next/link";
import { LogIn } from "lucide-react";
import type { Metadata } from "next";
import { login } from "@/app/auth/actions";
import { TradioLogo } from "@/components/tradio-logo";

export const metadata: Metadata = {
  title: "Log in",
  robots: {
    follow: false,
    index: false,
  },
};

type LoginPageProps = {
  searchParams: {
    message?: string;
    redirectedFrom?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-5 py-10 text-ink">
      <section className="surface-pad w-full max-w-md">
        <div className="rounded-lg border border-field bg-white p-4 text-center">
          <TradioLogo className="justify-center" dark />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Log in to your workspace
          </p>
        </div>

        <form action={login} className="mt-8 space-y-5">
          <input
            name="redirectedFrom"
            type="hidden"
            value={searchParams.redirectedFrom ?? "/dashboard"}
          />

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

          {searchParams.message ? (
            <p className="notice">
              {searchParams.message}
            </p>
          ) : null}

          <button className="btn-primary w-full py-2.5">
            <LogIn aria-hidden="true" size={17} />
            Log in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New to Tradio?{" "}
          <Link className="font-semibold text-copper hover:underline" href="/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
