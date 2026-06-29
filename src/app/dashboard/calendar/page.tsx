import Link from "next/link";
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  createScheduleEvent,
  deleteScheduleEvent,
  updateScheduleEvent,
  updateScheduleStatus,
} from "@/app/dashboard/calendar/actions";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { hasProAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

type CalendarPageProps = {
  searchParams: Promise<{ message?: string; month?: string }>;
};

type NamedRelation = { name?: string | null };
type JobRelation = { title?: string | null };

type ScheduleEvent = {
  all_day: boolean;
  customer_id: string | null;
  customers: NamedRelation | NamedRelation[] | null;
  end_at: string;
  event_type: string;
  id: string;
  job_id: string | null;
  jobs: JobRelation | JobRelation[] | null;
  location: string | null;
  notes: string | null;
  start_at: string;
  status: string;
  title: string;
};

type CalendarEntry = {
  id: string;
  kind: "event" | "job-due" | "job-start";
  label: string;
  status: string;
  time?: string;
};

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const eventTypes = [
  { label: "Appointment", value: "appointment" },
  { label: "Job visit", value: "job" },
  { label: "Reminder", value: "reminder" },
  { label: "Blocked time", value: "blocked" },
];
const statuses = [
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const entryClasses: Record<CalendarEntry["kind"], string> = {
  event: "border-orange-200 bg-[#fff5ef] text-[#b83f00]",
  "job-due": "border-red-200 bg-red-50 text-red-700",
  "job-start": "border-blue-200 bg-blue-50 text-blue-700",
};

function singleRelation<T>(relation: T | T[] | null) {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function londonParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/London",
    year: "numeric",
  }).formatToParts(new Date(value));
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

function todayInLondon() {
  return londonParts(new Date().toISOString()).date;
}

function validMonth(value?: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "")
    ? value!
    : todayInLondon().slice(0, 7);
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return date.toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function monthDates(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7;
  const result: Array<string | null> = Array.from({ length: leading }, () => null);

  for (let day = 1; day <= days; day += 1) {
    result.push(`${month}-${String(day).padStart(2, "0")}`);
  }

  while (result.length % 7 !== 0) result.push(null);
  return result;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
    weekday: "short",
  }).format(new Date(value));
}

function statusLabel(value: string) {
  return statuses.find((status) => status.value === value)?.label ?? value;
}

function eventTypeLabel(value: string) {
  return eventTypes.find((type) => type.value === value)?.label ?? value;
}

function eventFormFields({
  customers,
  event,
  jobs,
  month,
}: {
  customers: { id: string; name: string }[];
  event?: ScheduleEvent;
  jobs: { customer_id: string; id: string; title: string }[];
  month: string;
}) {
  const defaultDate = event
    ? londonParts(event.start_at).date
    : month === todayInLondon().slice(0, 7)
      ? todayInLondon()
      : `${month}-01`;
  const start = event ? londonParts(event.start_at) : { time: "09:00" };
  const end = event ? londonParts(event.end_at) : { date: defaultDate, time: "10:00" };

  return (
    <>
      <input name="calendar_month" type="hidden" value={month} />
      {event ? <input name="id" type="hidden" value={event.id} /> : null}
      <div className="sm:col-span-2">
        <label className="text-sm font-medium" htmlFor={`title-${event?.id ?? "new"}`}>
          Title
        </label>
        <input
          className="field-control"
          defaultValue={event?.title}
          id={`title-${event?.id ?? "new"}`}
          name="title"
          placeholder="Boiler service at Smith residence"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor={`type-${event?.id ?? "new"}`}>
          Type
        </label>
        <select
          className="field-control"
          defaultValue={event?.event_type ?? "appointment"}
          id={`type-${event?.id ?? "new"}`}
          name="event_type"
        >
          {eventTypes.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor={`status-${event?.id ?? "new"}`}>
          Status
        </label>
        <select
          className="field-control"
          defaultValue={event?.status ?? "scheduled"}
          id={`status-${event?.id ?? "new"}`}
          name="status"
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor={`customer-${event?.id ?? "new"}`}>
          Customer
        </label>
        <select
          className="field-control"
          defaultValue={event?.customer_id ?? ""}
          id={`customer-${event?.id ?? "new"}`}
          name="customer_id"
        >
          <option value="">No customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor={`job-${event?.id ?? "new"}`}>
          Job
        </label>
        <select
          className="field-control"
          defaultValue={event?.job_id ?? ""}
          id={`job-${event?.id ?? "new"}`}
          name="job_id"
        >
          <option value="">No linked job</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>{job.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor={`start-date-${event?.id ?? "new"}`}>
          Start date
        </label>
        <input
          className="field-control"
          defaultValue={defaultDate}
          id={`start-date-${event?.id ?? "new"}`}
          name="start_date"
          required
          type="date"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor={`start-time-${event?.id ?? "new"}`}>
          Start time
        </label>
        <input
          className="field-control"
          defaultValue={start.time}
          id={`start-time-${event?.id ?? "new"}`}
          name="start_time"
          required
          type="time"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor={`end-date-${event?.id ?? "new"}`}>
          End date
        </label>
        <input
          className="field-control"
          defaultValue={end.date ?? defaultDate}
          id={`end-date-${event?.id ?? "new"}`}
          name="end_date"
          required
          type="date"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor={`end-time-${event?.id ?? "new"}`}>
          End time
        </label>
        <input
          className="field-control"
          defaultValue={end.time}
          id={`end-time-${event?.id ?? "new"}`}
          name="end_time"
          required
          type="time"
        />
      </div>
      <label className="flex items-center gap-3 rounded-lg border border-field px-3 py-3 text-sm font-medium sm:col-span-2">
        <input defaultChecked={event?.all_day} name="all_day" type="checkbox" />
        All-day entry
      </label>
      <div className="sm:col-span-2">
        <label className="text-sm font-medium" htmlFor={`location-${event?.id ?? "new"}`}>
          Location
        </label>
        <input
          className="field-control"
          defaultValue={event?.location ?? ""}
          id={`location-${event?.id ?? "new"}`}
          name="location"
          placeholder="Job address or meeting place"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm font-medium" htmlFor={`notes-${event?.id ?? "new"}`}>
          Notes
        </label>
        <textarea
          className="field-control min-h-24"
          defaultValue={event?.notes ?? ""}
          id={`notes-${event?.id ?? "new"}`}
          name="notes"
        />
      </div>
    </>
  );
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const search = await searchParams;
  const month = validMonth(search.month);
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

  const monthStart = `${month}-01`;
  const nextMonth = shiftMonth(month, 1);
  const today = todayInLondon();
  const upcomingEnd = new Date();
  upcomingEnd.setUTCDate(upcomingEnd.getUTCDate() + 31);
  const queryStart = monthStart < today ? monthStart : today;
  const queryEnd = `${nextMonth}-01` > upcomingEnd.toISOString().slice(0, 10)
    ? `${nextMonth}-01`
    : upcomingEnd.toISOString().slice(0, 10);

  const [eventsResult, customersResult, jobsResult] = await Promise.all([
    supabase
      .from("schedule_events")
      .select(
        "id, customer_id, job_id, title, event_type, status, start_at, end_at, all_day, location, notes, customers(name), jobs(title)",
      )
      .eq("user_id", user.id)
      .gte("start_at", `${queryStart}T00:00:00Z`)
      .lt("start_at", `${queryEnd}T23:59:59Z`)
      .order("start_at", { ascending: true }),
    supabase
      .from("customers")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("jobs")
      .select("id, customer_id, title, status, start_date, due_date")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
  ]);

  const scheduleMissing = Boolean(
    eventsResult.error?.message.includes("schedule_events") ||
      eventsResult.error?.message.includes("schema cache"),
  );
  const firstError =
    customersResult.error ?? jobsResult.error ?? (scheduleMissing ? null : eventsResult.error);
  if (firstError) redirect(`/dashboard?message=${encodeURIComponent(firstError.message)}`);

  const events = (scheduleMissing ? [] : eventsResult.data ?? []) as ScheduleEvent[];
  const customers = customersResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const entriesByDate = new Map<string, CalendarEntry[]>();
  const addEntry = (date: string, entry: CalendarEntry) => {
    entriesByDate.set(date, [...(entriesByDate.get(date) ?? []), entry]);
  };

  events.forEach((event) => {
    const local = londonParts(event.start_at);
    if (local.date.startsWith(month)) {
      addEntry(local.date, {
        id: event.id,
        kind: "event",
        label: event.title,
        status: event.status,
        time: event.all_day ? "All day" : local.time,
      });
    }
  });
  jobs.forEach((job) => {
    if (job.start_date?.startsWith(month)) {
      addEntry(job.start_date, {
        id: `${job.id}-start`,
        kind: "job-start",
        label: job.title,
        status: "Job starts",
      });
    }
    if (job.due_date?.startsWith(month)) {
      addEntry(job.due_date, {
        id: `${job.id}-due`,
        kind: "job-due",
        label: job.title,
        status: "Job due",
      });
    }
  });

  const upcoming = events
    .filter(
      (event) =>
        event.status !== "cancelled" &&
        new Date(event.end_at).getTime() >= Date.now(),
    )
    .slice(0, 8);
  const monthEvents = events.filter((event) =>
    londonParts(event.start_at).date.startsWith(month),
  );

  return (
    <AppShell active="calendar" plan={profile?.plan}>
      <header className="app-page-header">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Pro scheduling</p>
            <h1 className="page-title">Plan jobs, visits and working time.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Appointments share customers and jobs with Tradio while remaining
              available as an independent scheduling module.
            </p>
          </div>
          <span className="status-pill w-fit bg-[#fff0e7] text-copper">Pro feature</span>
        </div>
      </header>

      <div className="app-page-body space-y-6">
        {search.message ? <p className="notice">{search.message}</p> : null}
        {scheduleMissing ? (
          <p className="notice">
            Scheduling needs its database update. Run the contents of
            supabase/scheduling.sql in Supabase, then refresh this page.
          </p>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="surface overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-field p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow">Month view</p>
                <h2 className="mt-1 text-xl font-black">{monthLabel(month)}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="btn-secondary" href={`/dashboard/calendar?month=${shiftMonth(month, -1)}`} aria-label="Previous month">
                  <ChevronLeft aria-hidden="true" size={17} />
                </Link>
                <Link className="btn-secondary" href="/dashboard/calendar">Today</Link>
                <Link className="btn-secondary" href={`/dashboard/calendar?month=${shiftMonth(month, 1)}`} aria-label="Next month">
                  <ChevronRight aria-hidden="true" size={17} />
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[840px]">
                <div className="grid grid-cols-7 border-b border-field bg-mist">
                  {weekDays.map((day) => (
                    <div className="px-3 py-2 text-center text-xs font-bold uppercase text-slate-500" key={day}>{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthDates(month).map((date, index) => (
                    <div
                      className={`min-h-32 border-b border-r border-field p-2 ${date === today ? "bg-orange-50" : "bg-white"}`}
                      key={date ?? `blank-${index}`}
                    >
                      {date ? (
                        <>
                          <p className={`text-xs font-black ${date === today ? "text-copper" : "text-slate-500"}`}>
                            {Number(date.slice(-2))}
                          </p>
                          <div className="mt-2 space-y-1.5">
                            {(entriesByDate.get(date) ?? []).slice(0, 4).map((entry) => (
                              <div className={`rounded-md border px-2 py-1 text-[11px] leading-4 ${entryClasses[entry.kind]} ${entry.status === "cancelled" ? "opacity-50 line-through" : ""}`} key={entry.id}>
                                <p className="truncate font-bold">{entry.time ? `${entry.time} ` : ""}{entry.label}</p>
                                {entry.kind !== "event" ? <p className="truncate opacity-75">{entry.status}</p> : null}
                              </div>
                            ))}
                            {(entriesByDate.get(date) ?? []).length > 4 ? (
                              <p className="text-[11px] font-semibold text-slate-400">+{(entriesByDate.get(date) ?? []).length - 4} more</p>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="surface-pad h-fit">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-field text-forest">
                <Clock3 aria-hidden="true" size={19} />
              </div>
              <div>
                <p className="eyebrow">Next up</p>
                <h2 className="font-semibold">Upcoming schedule</h2>
              </div>
            </div>
            <div className="mt-5 divide-y divide-field">
              {upcoming.length ? upcoming.map((event) => {
                const local = londonParts(event.start_at);
                const customer = singleRelation(event.customers);
                return (
                  <div className="py-4 first:pt-0" key={event.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{event.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {dateLabel(event.start_at)} · {event.all_day ? "All day" : local.time}
                        </p>
                      </div>
                      <span className="status-pill bg-[#fff0e7] text-copper">{eventTypeLabel(event.event_type)}</span>
                    </div>
                    {customer?.name ? <p className="mt-2 text-xs text-slate-500">{customer.name}</p> : null}
                    {event.location ? <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin aria-hidden="true" size={12} />{event.location}</p> : null}
                  </div>
                );
              }) : <p className="py-6 text-center text-sm text-slate-500">Nothing scheduled yet.</p>}
            </div>
          </aside>
        </section>

        <section className="surface-pad">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-field text-forest"><Plus aria-hidden="true" size={19} /></div>
            <div><p className="eyebrow">New entry</p><h2 className="font-semibold">Add to the schedule</h2></div>
          </div>
          <form action={createScheduleEvent} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {eventFormFields({ customers, jobs, month })}
            <div className="sm:col-span-2 lg:col-span-4">
              <button className="btn-accent"><CalendarDays aria-hidden="true" size={17} />Add to calendar</button>
            </div>
          </form>
        </section>

        <section className="surface overflow-hidden">
          <div className="border-b border-field p-5">
            <p className="eyebrow">Manage entries</p>
            <h2 className="mt-1 font-semibold">{monthLabel(month)} schedule</h2>
          </div>
          <div className="divide-y divide-field">
            {monthEvents.length ? monthEvents.map((event) => {
              const local = londonParts(event.start_at);
              const customer = singleRelation(event.customers);
              const job = singleRelation(event.jobs);
              return (
                <details className="group p-5" key={event.id}>
                  <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        <span className="status-pill bg-[#fff0e7] text-copper">{eventTypeLabel(event.event_type)}</span>
                        <span className="status-pill bg-slate-100 text-slate-600">{statusLabel(event.status)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {dateLabel(event.start_at)} · {event.all_day ? "All day" : `${local.time}–${londonParts(event.end_at).time}`}
                      </p>
                      {customer?.name || job?.title ? <p className="mt-1 text-xs text-slate-400">{[customer?.name, job?.title].filter(Boolean).join(" · ")}</p> : null}
                    </div>
                    <span className="text-sm font-semibold text-copper group-open:hidden">Edit</span>
                  </summary>
                  <div className="mt-5 border-t border-field pt-5">
                    <form action={updateScheduleEvent} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {eventFormFields({ customers, event, jobs, month })}
                      <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row lg:col-span-4">
                        <button className="btn-primary"><Save aria-hidden="true" size={17} />Save changes</button>
                      </div>
                    </form>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <form action={updateScheduleStatus}>
                        <input name="id" type="hidden" value={event.id} />
                        <input name="calendar_month" type="hidden" value={month} />
                        <input name="status" type="hidden" value={event.status === "completed" ? "scheduled" : "completed"} />
                        <button className="btn-secondary">{event.status === "completed" ? "Mark scheduled" : "Mark completed"}</button>
                      </form>
                      <form action={deleteScheduleEvent}>
                        <input name="id" type="hidden" value={event.id} />
                        <input name="calendar_month" type="hidden" value={month} />
                        <ConfirmSubmitButton className="btn-secondary text-red-700" message="Delete this schedule entry?">
                          <Trash2 aria-hidden="true" size={16} />Delete
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                </details>
              );
            }) : (
              <div className="p-8 text-center">
                <BriefcaseBusiness className="mx-auto text-slate-300" size={28} />
                <p className="mt-3 text-sm text-slate-500">No schedule entries in this month.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

