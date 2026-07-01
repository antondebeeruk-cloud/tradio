"use server";

import { redirect } from "next/navigation";
import { createPersonalClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const emailEntry = formData.get("email");
  const email = typeof emailEntry === "string" ? emailEntry.trim() : "";
  if (!email) redirect("/forgot-password?message=Enter your email address.");

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    "https://tradio.uk"
  ).replace(/\/$/, "");
  const supabase = await createPersonalClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  redirect(
    "/forgot-password?sent=true&message=If an account exists for that email, a password reset link has been sent.",
  );
}
