"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasProAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

const eventTypes = ["appointment", "job", "reminder", "blocked"] as const;
const eventStatuses = ["scheduled", "completed", "cancelled"] as const;

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalValue(formData: FormData, key: string) {
  return stringValue(formData, key) || null;
}

function calendarRedirect(formData: FormData, message: string): never {
  const month = stringValue(formData, "calendar_month");
  const query = new URLSearchParams({ message });

  if (/^\d{4}-\d{2}$/.test(month)) {
    query.set("month", month);
  }

  redirect(`/dashboard/calendar?${query.toString()}`);
}

function nextDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const value = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(value.getTime())) return date;
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function londonOffsetMinutes(timestamp: number) {
  const zoneName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    timeZoneName: "shortOffset",
  })
    .formatToParts(new Date(timestamp))
    .find((part) => part.type === "timeZoneName")?.value;
  const match = zoneName?.match(/GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?/);

  if (!match?.[2]) return 0;
  const direction = match[1] === "-" ? -1 : 1;
  return (
    direction *
    (Number(match[2]) * 60 + Number(match[3] ?? 0))
  );
}

function londonDateTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const wallClock = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(wallClock)) return null;
  const firstOffset = londonOffsetMinutes(wallClock);
  const candidate = wallClock - firstOffset * 60_000;
  const finalOffset = londonOffsetMinutes(candidate);
  return new Date(wallClock - finalOffset * 60_000).toISOString();
}

async function requireProUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectedFrom=/dashboard/calendar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!hasProAccess(profile)) {
    redirect(
      "/pricing?message=Scheduling and calendar are available on Tradio Pro and Elite.",
    );
  }

  return { supabase, user };
}

async function validateLinks({
  customerId,
  jobId,
  supabase,
  userId,
}: {
  customerId: string | null;
  jobId: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  if (customerId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!customer) return false;
  }

  if (jobId) {
    const { data: job } = await supabase
      .from("jobs")
      .select("id, customer_id")
      .eq("id", jobId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!job || (customerId && job.customer_id !== customerId)) return false;
  }

  return true;
}

function eventValues(formData: FormData) {
  const allDay = stringValue(formData, "all_day") === "on";
  const startDate = stringValue(formData, "start_date");
  const endDate = allDay ? nextDate(startDate) : stringValue(formData, "end_date");
  const startAt = londonDateTime(
    startDate,
    allDay ? "00:00" : stringValue(formData, "start_time"),
  );
  const endAt = londonDateTime(
    endDate,
    allDay ? "00:00" : stringValue(formData, "end_time"),
  );
  const eventType = stringValue(formData, "event_type");
  const status = stringValue(formData, "status") || "scheduled";

  return {
    allDay,
    customerId: optionalValue(formData, "customer_id"),
    endAt,
    eventType,
    jobId: optionalValue(formData, "job_id"),
    location: optionalValue(formData, "location"),
    notes: optionalValue(formData, "notes"),
    startAt,
    status,
    title: stringValue(formData, "title"),
  };
}

function validEvent(values: ReturnType<typeof eventValues>) {
  return Boolean(
    values.title &&
      values.startAt &&
      values.endAt &&
      new Date(values.endAt).getTime() > new Date(values.startAt).getTime() &&
      eventTypes.includes(values.eventType as (typeof eventTypes)[number]) &&
      eventStatuses.includes(values.status as (typeof eventStatuses)[number]),
  );
}

export async function createScheduleEvent(formData: FormData) {
  const { supabase, user } = await requireProUser();
  const values = eventValues(formData);

  if (!validEvent(values)) {
    calendarRedirect(formData, "Add a title and a valid start and end time.");
  }

  if (
    !(await validateLinks({
      customerId: values.customerId,
      jobId: values.jobId,
      supabase,
      userId: user.id,
    }))
  ) {
    calendarRedirect(formData, "The selected customer or job is not available.");
  }

  const { error } = await supabase.from("schedule_events").insert({
    all_day: values.allDay,
    customer_id: values.customerId,
    end_at: values.endAt,
    event_type: values.eventType,
    job_id: values.jobId,
    location: values.location,
    notes: values.notes,
    start_at: values.startAt,
    status: values.status,
    title: values.title,
    user_id: user.id,
  });

  if (error) calendarRedirect(formData, error.message);
  revalidatePath("/dashboard/calendar");
  calendarRedirect(formData, "Schedule entry created.");
}

export async function updateScheduleEvent(formData: FormData) {
  const { supabase, user } = await requireProUser();
  const id = stringValue(formData, "id");
  const values = eventValues(formData);

  if (!id || !validEvent(values)) {
    calendarRedirect(formData, "Schedule entry could not be updated.");
  }

  if (
    !(await validateLinks({
      customerId: values.customerId,
      jobId: values.jobId,
      supabase,
      userId: user.id,
    }))
  ) {
    calendarRedirect(formData, "The selected customer or job is not available.");
  }

  const { error } = await supabase
    .from("schedule_events")
    .update({
      all_day: values.allDay,
      customer_id: values.customerId,
      end_at: values.endAt,
      event_type: values.eventType,
      job_id: values.jobId,
      location: values.location,
      notes: values.notes,
      start_at: values.startAt,
      status: values.status,
      title: values.title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) calendarRedirect(formData, error.message);
  revalidatePath("/dashboard/calendar");
  calendarRedirect(formData, "Schedule entry updated.");
}

export async function updateScheduleStatus(formData: FormData) {
  const { supabase, user } = await requireProUser();
  const id = stringValue(formData, "id");
  const status = stringValue(formData, "status");

  if (!id || !eventStatuses.includes(status as (typeof eventStatuses)[number])) {
    calendarRedirect(formData, "Invalid schedule status.");
  }

  const { error } = await supabase
    .from("schedule_events")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) calendarRedirect(formData, error.message);
  revalidatePath("/dashboard/calendar");
  calendarRedirect(formData, "Schedule status updated.");
}

export async function deleteScheduleEvent(formData: FormData) {
  const { supabase, user } = await requireProUser();
  const id = stringValue(formData, "id");

  if (!id) calendarRedirect(formData, "Schedule entry not found.");

  const { error } = await supabase
    .from("schedule_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) calendarRedirect(formData, error.message);
  revalidatePath("/dashboard/calendar");
  calendarRedirect(formData, "Schedule entry deleted.");
}
