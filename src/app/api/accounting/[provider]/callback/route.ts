import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  accountingProviderLabel,
  accountingStateCookieName,
  exchangeAccountingCode,
  getAccountingOrganisation,
  logAccountingAuditEvent,
  parseAccountingProvider,
  saveAccountingConnection,
} from "@/lib/accounting-integrations";
import { createClient } from "@/lib/supabase/server";
import { siteRedirect } from "@/lib/site-url";

export const runtime = "nodejs";

function settingsRedirect(message: string) {
  const response = NextResponse.redirect(
    siteRedirect(`/settings?message=${encodeURIComponent(message)}`),
    302,
  );
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function loginRedirect() {
  const response = NextResponse.redirect(
    siteRedirect("/login?redirectedFrom=/settings"),
    302,
  );
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerValue } = await context.params;
  const provider = parseAccountingProvider(providerValue);
  if (!provider) return settingsRedirect("Unknown accounting provider.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return loginRedirect();

  const label = accountingProviderLabel(provider);
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const returnedError = params.get("error") ?? params.get("reason");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(accountingStateCookieName(provider))?.value;
  cookieStore.delete(accountingStateCookieName(provider));
  const meta = {
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  };

  if (returnedError) {
    await logAccountingAuditEvent({
      action: "connect-callback",
      message: `${label} returned an OAuth error.`,
      provider,
      status: "failure",
      userId: user.id,
      ...meta,
    });
    return settingsRedirect(`${label} connection was cancelled.`);
  }

  if (!code || !state || !savedState || state !== savedState) {
    await logAccountingAuditEvent({
      action: "connect-callback",
      message: "OAuth state verification failed.",
      provider,
      status: "failure",
      userId: user.id,
      ...meta,
    });
    return settingsRedirect(`${label} connection could not be verified.`);
  }

  try {
    const tokenSet = await exchangeAccountingCode(provider, code);
    const organisation = await getAccountingOrganisation(
      provider,
      tokenSet.access_token,
      params.get("realmId"),
    );
    await saveAccountingConnection({ organisation, tokenSet, userId: user.id });
    await logAccountingAuditEvent({
      action: "connect-callback",
      message: "Connected organisation successfully.",
      provider,
      status: "success",
      userId: user.id,
      ...meta,
    });
    return settingsRedirect(
      `${label} connected to ${organisation.name ?? "your organisation"}.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : `Could not finish ${label} connection.`;
    await logAccountingAuditEvent({
      action: "connect-callback",
      message: `${label} connection failed during secure callback processing.`,
      provider,
      status: "failure",
      userId: user.id,
      ...meta,
    });
    return settingsRedirect(
      provider === "quickbooks" ? "Could not finish the QuickBooks connection." : message,
    );
  }
}
