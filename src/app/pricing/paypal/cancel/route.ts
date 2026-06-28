import { NextResponse, type NextRequest } from "next/server";
import { siteRedirect } from "@/lib/site-url";

export async function GET(_request: NextRequest) {
  return NextResponse.redirect(
    siteRedirect("/pricing?message=PayPal checkout was cancelled."),
  );
}
