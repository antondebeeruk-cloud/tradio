import Link from "next/link";
import { UserPlus } from "lucide-react";
import Image from "next/image";
import { signup } from "@/app/auth/actions";

type SignupPageProps = {
  searchParams: {
    message?: string;
  };
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-5 py-10 text-ink">
      <section className="surface-pad w-full max-w-md">
        <div className="rounded-lg border border-field bg-white p-4 text-center">
          <Image
            alt="Tradio"
            className="mx-auto h-28 w-full object-contain"
            height={180}
            src="/tradio-logo.png"
            width={260}
          />
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

          {searchParams.message ? (
            <p className="notice">
              {searchParams.message}
            </p>
          ) : null}

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
