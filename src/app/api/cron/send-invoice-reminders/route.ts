import { NextResponse, type NextRequest } from "next/server";
import { sendAutomaticInvoiceReminders } from "@/lib/invoice-reminders";

export const runtime = "nodejs";

function tokenFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || tokenFromRequest(request) !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendAutomaticInvoiceReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Invoice reminder cron failed",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.json(
      { error: "Invoice reminders failed." },
      { status: 500 },
    );
  }
}
