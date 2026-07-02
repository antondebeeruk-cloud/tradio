import { NextRequest, NextResponse } from "next/server";
import {
  accountingProviderLabel,
  deleteAccountingConnection,
  logAccountingAuditEvent,
  parseAccountingProvider,
} from "@/lib/accounting-integrations";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
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
      new URL(`/settings?message=${encodeURIComponent(`${label} disconnected.`)}`, request.url),
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
      new URL(`/settings?message=${encodeURIComponent(message)}`, request.url),
    );
  }
}
