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

export const runtime = "nodejs";

function settingsRedirect(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(`/settings?message=${encodeURIComponent(message)}`, request.url),
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerValue } = await context.params;
  const provider = parseAccountingProvider(providerValue);
  if (!provider) return NextResponse.json({ error: "Unknown accounting provider." }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?redirectedFrom=/settings", request.url));

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
      message: `${label} returned error: ${returnedError}`,
      provider,
      status: "failure",
      userId: user.id,
      ...meta,
    });
    return settingsRedirect(request, `${label} connection cancelled: ${returnedError}`);
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
    return settingsRedirect(request, `${label} connection could not be verified.`);
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
      message: `Connected organisation ${organisation.id}.`,
      provider,
      status: "success",
      userId: user.id,
      ...meta,
    });
    return settingsRedirect(
      request,
      `${label} connected to ${organisation.name ?? "your organisation"}.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : `Could not finish ${label} connection.`;
    await logAccountingAuditEvent({
      action: "connect-callback",
      message,
      provider,
      status: "failure",
      userId: user.id,
      ...meta,
    });
    return settingsRedirect(request, message);
  }
}
