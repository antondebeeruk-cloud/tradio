import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteXeroConnection, logXeroAuditEvent } from "@/lib/xero";

export const runtime = "nodejs";

function requestMeta(request: NextRequest) {
  return {
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?redirectedFrom=/settings", request.url),
    );
  }

  try {
    await deleteXeroConnection(user.id);

    await logXeroAuditEvent({
      action: "xero-disconnect",
      status: "success",
      userId: user.id,
      ...requestMeta(request),
    });

    return NextResponse.redirect(
      new URL(
        `/settings?message=${encodeURIComponent("Xero disconnected.")}`,
        request.url,
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not disconnect Xero.";

    await logXeroAuditEvent({
      action: "xero-disconnect",
      message,
      status: "failure",
      userId: user.id,
      ...requestMeta(request),
    });

    return NextResponse.redirect(
      new URL(`/settings?message=${encodeURIComponent(message)}`, request.url),
    );
  }
}
