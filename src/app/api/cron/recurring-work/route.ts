import { NextResponse } from "next/server";
import { processRecurringJobs, sendAppointmentReminders } from "@/lib/recurring-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const jobs = await processRecurringJobs();
    try {
      const reminders = await sendAppointmentReminders();
      return NextResponse.json({ generated: jobs.generated, remindersSent: reminders.sent });
    } catch {
      return NextResponse.json({ generated: jobs.generated, remindersSent: 0, reminderRetryNeeded: true });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Recurring work failed." }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
