import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeXeroCodeForToken,
  getXeroTenants,
  logXeroAuditEvent,
  saveXeroConnection,
  xeroStateCookieName,
} from "@/lib/xero";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function settingsRedirect(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(`/settings?message=${encodeURIComponent(message)}`, request.url),
  );
}

function requestMeta(request: NextRequest) {
  return {
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?redirectedFrom=/settings", request.url),
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");
  const savedState = cookies().get(xeroStateCookieName)?.value;

  cookies().delete(xeroStateCookieName);

  if (error) {
    await logXeroAuditEvent({
      action: "xero-connect-callback",
      message: `Xero returned error: ${error}`,
      status: "failure",
      userId: user.id,
      ...requestMeta(request),
    });

    return settingsRedirect(request, `Xero connection cancelled: ${error}`);
  }

  if (!code || !state || !savedState || state !== savedState) {
    await logXeroAuditEvent({
      action: "xero-connect-callback",
      message: "OAuth state verification failed.",
      status: "failure",
      userId: user.id,
      ...requestMeta(request),
    });

    return settingsRedirect(request, "Xero connection could not be verified.");
  }

  try {
    const tokenSet = await exchangeXeroCodeForToken(code);
    const tenants = await getXeroTenants(tokenSet.access_token);
    const tenant = tenants[0];

    if (!tenant) {
      await logXeroAuditEvent({
        action: "xero-connect-callback",
        message: "No Xero tenant was available after consent.",
        status: "failure",
        userId: user.id,
        ...requestMeta(request),
      });

      return settingsRedirect(
        request,
        "Xero connected, but no organisation was available.",
      );
    }

    await saveXeroConnection({
      tenant,
      tokenSet,
      userId: user.id,
    });

    await logXeroAuditEvent({
      action: "xero-connect-callback",
      message: `Connected tenant ${tenant.tenantId}.`,
      status: "success",
      userId: user.id,
      ...requestMeta(request),
    });

    return settingsRedirect(
      request,
      `Xero connected to ${tenant.tenantName ?? "your organisation"}.`,
    );
  } catch (callbackError) {
    const message =
      callbackError instanceof Error
        ? callbackError.message
        : "Could not finish Xero connection.";

    await logXeroAuditEvent({
      action: "xero-connect-callback",
      message,
      status: "failure",
      userId: user.id,
      ...requestMeta(request),
    });

    return settingsRedirect(request, message);
  }
}
