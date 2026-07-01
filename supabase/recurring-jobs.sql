begin;

create table if not exists public.recurring_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  title text not null,
  job_type text,
  description text,
  notes text,
  frequency text not null check (frequency in ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annually')),
  start_date date not null,
  end_date date,
  next_run_date date not null,
  expected_value numeric(12, 2) not null default 0 check (expected_value >= 0),
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  visit_time time not null default '09:00',
  location text,
  send_reminder boolean not null default true,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'completed')),
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs
  add column if not exists recurring_job_id uuid references public.recurring_jobs (id) on delete set null,
  add column if not exists occurrence_date date;

alter table public.schedule_events
  add column if not exists recurring_job_id uuid references public.recurring_jobs (id) on delete set null,
  add column if not exists reminder_sent_at timestamptz;

create unique index if not exists jobs_recurring_occurrence_unique
  on public.jobs (recurring_job_id, occurrence_date)
  where recurring_job_id is not null and occurrence_date is not null;
create index if not exists recurring_jobs_due_idx
  on public.recurring_jobs (status, next_run_date);
create index if not exists recurring_jobs_user_idx
  on public.recurring_jobs (user_id, status);

alter table public.recurring_jobs enable row level security;

do $$
declare policy_name text;
begin
  for policy_name in select policyname from pg_policies where schemaname = 'public' and tablename = 'recurring_jobs'
  loop execute format('drop policy if exists %I on public.recurring_jobs', policy_name); end loop;
end
$$;

create policy "Pro workspace members can view recurring jobs" on public.recurring_jobs for select
  using (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access());
create policy "Pro workspace members can create recurring jobs" on public.recurring_jobs for insert
  with check (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access());
create policy "Pro workspace members can update recurring jobs" on public.recurring_jobs for update
  using (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access())
  with check (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access());
create policy "Pro workspace members can delete recurring jobs" on public.recurring_jobs for delete
  using (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access());

drop trigger if exists workspace_activity_trigger on public.recurring_jobs;
create trigger workspace_activity_trigger after insert or update or delete on public.recurring_jobs
  for each row execute function public.log_workspace_record_change();

notify pgrst, 'reload schema';
commit;
