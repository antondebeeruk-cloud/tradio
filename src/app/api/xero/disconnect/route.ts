import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteXeroConnection } from "@/lib/xero";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = createClient();
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

    return NextResponse.redirect(
      new URL(
        `/settings?message=${encodeURIComponent("Xero disconnected.")}`,
        request.url,
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not disconnect Xero.";

    return NextResponse.redirect(
      new URL(`/settings?message=${encodeURIComponent(message)}`, request.url),
    );
  }
}
