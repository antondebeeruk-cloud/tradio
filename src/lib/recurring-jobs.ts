import { sendSmtpEmail } from "@/lib/smtp";
import { hasProAccess } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";

type Frequency = "annually" | "fortnightly" | "monthly" | "quarterly" | "weekly";

function addFrequency(dateValue: string, frequency: Frequency) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  if (frequency === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  if (frequency === "fortnightly") date.setUTCDate(date.getUTCDate() + 14);
  if (frequency === "monthly") date.setUTCMonth(date.getUTCMonth() + 1);
  if (frequency === "quarterly") date.setUTCMonth(date.getUTCMonth() + 3);
  if (frequency === "annually") date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function dateTime(date: string, time: string) {
  return new Date(`${date}T${(time || "09:00").slice(0, 5)}:00`).toISOString();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
}

export async function processRecurringJobs(daysAhead = 30) {
  const admin = createAdminClient();
  const through = new Date();
  through.setDate(through.getDate() + daysAhead);
  const throughDate = through.toISOString().slice(0, 10);
  const { data: plans, error } = await admin
    .from("recurring_jobs")
    .select("*, customers(name)")
    .eq("status", "active")
    .lte("next_run_date", throughDate)
    .order("next_run_date");
  if (error) throw new Error(error.message);

  let generated = 0;
  for (const plan of plans ?? []) {
    const { data: profile } = await admin
      .from("profiles")
      .select("plan,subscription_status,trial_expires_at")
      .eq("id", plan.user_id)
      .maybeSingle();
    if (!hasProAccess(profile)) continue;

    let occurrence = plan.next_run_date;
    let safety = 0;
    while (occurrence <= throughDate && safety < 24) {
      safety += 1;
      if (plan.end_date && occurrence > plan.end_date) break;
      const { data: existing } = await admin
        .from("jobs")
        .select("id")
        .eq("recurring_job_id", plan.id)
        .eq("occurrence_date", occurrence)
        .maybeSingle();
      if (!existing) {
        const { data: job, error: jobError } = await admin.from("jobs").insert({
          customer_id: plan.customer_id,
          description: plan.description,
          due_date: occurrence,
          job_type: plan.job_type,
          notes: plan.notes,
          occurrence_date: occurrence,
          recurring_job_id: plan.id,
          start_date: occurrence,
          status: "not_started",
          title: plan.title,
          user_id: plan.user_id,
        }).select("id").single();
        if (jobError) throw new Error(jobError.message);

        const startAt = dateTime(occurrence, plan.visit_time);
        const endAt = new Date(new Date(startAt).getTime() + plan.duration_minutes * 60000).toISOString();
        const customer = Array.isArray(plan.customers) ? plan.customers[0] : plan.customers;
        const { error: eventError } = await admin.from("schedule_events").insert({
          customer_id: plan.customer_id,
          end_at: endAt,
          event_type: "job",
          job_id: job.id,
          location: plan.location,
          notes: plan.notes,
          recurring_job_id: plan.id,
          start_at: startAt,
          status: "scheduled",
          title: `${plan.title}${customer?.name ? ` - ${customer.name}` : ""}`,
          user_id: plan.user_id,
        });
        if (eventError) throw new Error(eventError.message);
        generated += 1;
      }
      occurrence = addFrequency(occurrence, plan.frequency as Frequency);
    }

    const completed = Boolean(plan.end_date && occurrence > plan.end_date);
    await admin.from("recurring_jobs").update({
      last_generated_at: new Date().toISOString(),
      next_run_date: occurrence,
      status: completed ? "completed" : "active",
      updated_at: new Date().toISOString(),
    }).eq("id", plan.id);
  }
  return { generated, plansChecked: plans?.length ?? 0 };
}

export async function sendAppointmentReminders() {
  const admin = createAdminClient();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!from) throw new Error("EMAIL_FROM or SMTP_USER is not configured.");
  const start = new Date();
  const end = new Date(start.getTime() + 25 * 60 * 60 * 1000);
  const { data: events, error } = await admin
    .from("schedule_events")
    .select("id,title,start_at,location,customers(name,email),recurring_jobs(send_reminder)")
    .not("recurring_job_id", "is", null)
    .is("reminder_sent_at", null)
    .gte("start_at", start.toISOString())
    .lte("start_at", end.toISOString())
    .eq("status", "scheduled");
  if (error) throw new Error(error.message);
  let sent = 0;
  for (const event of events ?? []) {
    const customer = Array.isArray(event.customers) ? event.customers[0] : event.customers;
    const recurring = Array.isArray(event.recurring_jobs) ? event.recurring_jobs[0] : event.recurring_jobs;
    if (!customer?.email || recurring?.send_reminder === false) continue;
    const when = new Date(event.start_at).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" });
    await sendSmtpEmail({ from, html: `<p>Hi ${escapeHtml(customer.name ?? "")},</p><p>This is a reminder for ${escapeHtml(event.title)} on ${escapeHtml(when)}.</p>${event.location ? `<p>Location: ${escapeHtml(event.location)}</p>` : ""}`, subject: `Appointment reminder: ${event.title}`, text: `Appointment reminder: ${event.title} on ${when}${event.location ? ` at ${event.location}` : ""}.`, to: customer.email });
    await admin.from("schedule_events").update({ reminder_sent_at: new Date().toISOString() }).eq("id", event.id);
    sent += 1;
  }
  return { sent };
}
