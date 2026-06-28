import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  buildXeroConsentUrl,
  logXeroAuditEvent,
  xeroStateCookieName,
} from "@/lib/xero";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function requestMeta(request: NextRequest) {
  return {
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?redirectedFrom=/settings", process.env.NEXT_PUBLIC_SITE_URL || "https://tradio.uk"),
    );
  }

  try {
    const state = randomUUID();
    const cookieStore = await cookies();
    cookieStore.set(xeroStateCookieName, state, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    await logXeroAuditEvent({
      action: "xero-connect-start",
      status: "success",
      userId: user.id,
      ...requestMeta(request),
    });

    return NextResponse.redirect(buildXeroConsentUrl(state));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start Xero connection.";

    await logXeroAuditEvent({
      action: "xero-connect-start",
      message,
      status: "failure",
      userId: user.id,
      ...requestMeta(request),
    });

    return NextResponse.redirect(
      new URL(
        `/settings?message=${encodeURIComponent(message)}`,
        process.env.NEXT_PUBLIC_SITE_URL || "https://tradio.uk",
      ),
    );
  }
}
