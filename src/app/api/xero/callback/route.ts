import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeXeroCodeForToken,
  getXeroTenants,
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
    return settingsRedirect(request, `Xero connection cancelled: ${error}`);
  }

  if (!code || !state || !savedState || state !== savedState) {
    return settingsRedirect(request, "Xero connection could not be verified.");
  }

  try {
    const tokenSet = await exchangeXeroCodeForToken(code);
    const tenants = await getXeroTenants(tokenSet.access_token);
    const tenant = tenants[0];

    if (!tenant) {
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

    return settingsRedirect(
      request,
      `Xero connected to ${tenant.tenantName ?? "your organisation"}.`,
    );
  } catch (callbackError) {
    const message =
      callbackError instanceof Error
        ? callbackError.message
        : "Could not finish Xero connection.";

    return settingsRedirect(request, message);
  }
}
