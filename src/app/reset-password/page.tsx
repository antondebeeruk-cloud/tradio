import { LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { updatePassword } from "@/app/reset-password/actions";
import { TradioLogo } from "@/components/tradio-logo";
import { createPersonalClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose New Password", robots: { follow: false, index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const search = await searchParams; const supabase = await createPersonalClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?message=Open the reset link from your email, or request a new one.");
  return <main className="flex min-h-screen items-center justify-center bg-mist px-5 py-10 text-ink"><section className="surface-pad w-full max-w-md"><div className="rounded-lg border border-field bg-white p-4 text-center"><TradioLogo className="justify-center" dark/><LockKeyhole className="mx-auto mt-4 text-copper" size={26}/><h1 className="mt-2 text-xl font-semibold">Choose a new password</h1><p className="mt-2 text-sm text-slate-500">Use at least eight characters.</p></div>{search.message?<p className="notice mt-6">{search.message}</p>:null}<form action={updatePassword} className="mt-7 space-y-5"><div><label className="text-sm font-medium" htmlFor="new-password">New password</label><input autoComplete="new-password" className="field-control" id="new-password" minLength={8} name="password" required type="password"/></div><div><label className="text-sm font-medium" htmlFor="confirm-password">Confirm password</label><input autoComplete="new-password" className="field-control" id="confirm-password" minLength={8} name="password_confirmation" required type="password"/></div><button className="btn-accent w-full"><LockKeyhole size={17}/>Update password</button></form></section></main>;
}
