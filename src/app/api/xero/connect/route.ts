import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildXeroConsentUrl, xeroStateCookieName } from "@/lib/xero";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createClient();
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
    cookies().set(xeroStateCookieName, state, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.redirect(buildXeroConsentUrl(state));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start Xero connection.";

    return NextResponse.redirect(
      new URL(
        `/settings?message=${encodeURIComponent(message)}`,
        process.env.NEXT_PUBLIC_SITE_URL || "https://tradio.uk",
      ),
    );
  }
}
