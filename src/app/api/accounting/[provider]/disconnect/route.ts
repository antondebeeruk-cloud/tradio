import { NextRequest, NextResponse } from "next/server";
import {
  accountingProviderLabel,
  deleteAccountingConnection,
  logAccountingAuditEvent,
  parseAccountingProvider,
} from "@/lib/accounting-integrations";
import { createClient } from "@/lib/supabase/server";
import { isTrustedSameOriginRequest } from "@/lib/request-security";
import { siteRedirect } from "@/lib/site-url";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  if (!isTrustedSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const { provider: providerValue } = await context.params;
  const provider = parseAccountingProvider(providerValue);
  if (!provider) return NextResponse.json({ error: "Unknown accounting provider." }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(siteRedirect("/login?redirectedFrom=/settings"));

  const label = accountingProviderLabel(provider);
  const meta = {
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  };

  try {
    await deleteAccountingConnection(provider, user.id);
    await logAccountingAuditEvent({
      action: "disconnect",
      provider,
      status: "success",
      userId: user.id,
      ...meta,
    });
    return NextResponse.redirect(
      siteRedirect(`/settings?message=${encodeURIComponent(`${label} disconnected.`)}`),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : `Could not disconnect ${label}.`;
    await logAccountingAuditEvent({
      action: "disconnect",
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
