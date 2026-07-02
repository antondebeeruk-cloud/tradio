import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  accountingProviderLabel,
  accountingStateCookieName,
  buildAccountingConsentUrl,
  logAccountingAuditEvent,
  parseAccountingProvider,
} from "@/lib/accounting-integrations";
import { createClient } from "@/lib/supabase/server";
import { siteRedirect } from "@/lib/site-url";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerValue } = await context.params;
  const provider = parseAccountingProvider(providerValue);
  if (!provider) return NextResponse.json({ error: "Unknown accounting provider." }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(siteRedirect("/login?redirectedFrom=/settings"));
  }

  const meta = {
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  };

  try {
    const state = randomUUID();
    const consentUrl = buildAccountingConsentUrl(provider, state);
    const cookieStore = await cookies();
    cookieStore.set(accountingStateCookieName(provider), state, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    await logAccountingAuditEvent({
      action: "connect-start",
      provider,
      status: "success",
      userId: user.id,
      ...meta,
    });
    return NextResponse.redirect(consentUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : `Could not start ${accountingProviderLabel(provider)} connection.`;
    await logAccountingAuditEvent({
      action: "connect-start",
      message,
      provider,
      status: "failure",
      userId: user.id,
      ...meta,
    });
    return NextResponse.redirect(
      siteRedirect(`/settings?message=${encodeURIComponent(message)}`),
    );
  }
}
