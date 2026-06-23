import { NextResponse, type NextRequest } from "next/server";
import { checkLeadsMailbox } from "@/lib/leads/imap";

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
    const result = await checkLeadsMailbox();
    return NextResponse.json({
      failed: result.failed,
      found: result.found,
      inspected: result.inspected,
      mailbox: result.mailbox,
      mailboxMessages: result.mailboxMessages,
      processed: result.processed,
      recipients: result.recipients,
      seen: result.seen,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error(
      "Lead mailbox cron failed",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.json(
      { error: "Lead mailbox check failed." },
      { status: 500 },
    );
  }
}
