import type { Metadata } from "next";
import { LockKeyhole, LogIn } from "lucide-react";
import { adminLogin } from "@/app/admin/login/actions";
import { TradioLogo } from "@/components/tradio-logo";

export const metadata: Metadata = {
  title: "Administrator Login",
  robots: { follow: false, index: false },
};

type AdminLoginPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const search = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#061d34] px-5 py-10 text-ink">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
        <div className="rounded-lg bg-[#061d34] p-5 text-center">
          <TradioLogo className="justify-center" />
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase text-orange-300">
            <LockKeyhole aria-hidden="true" size={15} />
            Platform administration
          </div>
        </div>

        <form action={adminLogin} className="mt-7 space-y-5">
          <div>
            <label className="text-sm font-medium" htmlFor="admin-email">
              Administrator email
            </label>
            <input
              autoComplete="email"
              className="field-control"
              id="admin-email"
              name="email"
              required
              type="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="admin-password">
              Password
            </label>
            <input
              autoComplete="current-password"
              className="field-control"
              id="admin-password"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </div>

          {search.message ? <p className="notice">{search.message}</p> : null}

          <button className="btn-accent w-full py-3">
            <LogIn aria-hidden="true" size={17} />
            Log in securely
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Access is restricted and support activity is recorded.
        </p>
      </section>
    </main>
  );
}

