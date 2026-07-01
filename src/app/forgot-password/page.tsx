import { KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { requestPasswordReset } from "@/app/forgot-password/actions";
import { TradioLogo } from "@/components/tradio-logo";

export const metadata: Metadata = { title: "Forgot Password", robots: { follow: false, index: false } };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ message?: string; sent?: string }> }) {
  const search = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-mist px-5 py-10 text-ink"><section className="surface-pad w-full max-w-md"><div className="rounded-lg border border-field bg-white p-4 text-center"><TradioLogo className="justify-center" dark/><KeyRound className="mx-auto mt-4 text-copper" size={26}/><h1 className="mt-2 text-xl font-semibold">Reset your password</h1><p className="mt-2 text-sm leading-6 text-slate-500">Enter your login email and Tradio will send you a secure reset link.</p></div>{search.message?<p className="notice mt-6">{search.message}</p>:null}{!search.sent?<form action={requestPasswordReset} className="mt-7 space-y-5"><div><label className="text-sm font-medium" htmlFor="recovery-email">Email</label><input autoComplete="email" className="field-control" id="recovery-email" name="email" required type="email"/></div><button className="btn-accent w-full"><Mail size={17}/>Send reset link</button></form>:null}<p className="mt-6 text-center text-sm"><Link className="font-semibold text-copper hover:underline" href="/login">Back to login</Link></p></section></main>;
}
