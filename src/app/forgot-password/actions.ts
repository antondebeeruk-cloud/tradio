"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createPersonalClient } from "@/lib/supabase/server";

function trustedOrigin(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const allowed =
      url.hostname === "tradio.uk" ||
      url.hostname === "www.tradio.uk" ||
      url.hostname === "localhost";
    return allowed ? url.origin : null;
  } catch {
    return null;
  }
}

export async function requestPasswordReset(formData: FormData) {
  const emailEntry = formData.get("email");
  const email = typeof emailEntry === "string" ? emailEntry.trim() : "";
  if (!email) redirect("/forgot-password?message=Enter your email address.");

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0].trim();
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
  const forwardedOrigin = forwardedHost
    ? `${forwardedProtocol}://${forwardedHost}`
    : null;
  const siteUrl = (
    trustedOrigin(requestHeaders.get("origin")) ||
    trustedOrigin(forwardedOrigin) ||
    trustedOrigin(process.env.NEXT_PUBLIC_SITE_URL ?? null) ||
    trustedOrigin(process.env.APP_URL ?? null) ||
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
