begin;

create or replace function public.current_user_has_pro_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.subscription_status = 'active'
      and (
        profiles.plan in ('pro', 'elite')
        or (
          profiles.plan = 'trial'
          and profiles.trial_expires_at > now()
        )
      )
  );
$$;

revoke all on function public.current_user_has_pro_access() from public;
grant execute on function public.current_user_has_pro_access() to authenticated;

create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  job_id uuid references public.jobs (id) on delete set null,
  title text not null,
  event_type text not null default 'appointment'
    check (event_type in ('appointment', 'job', 'reminder', 'blocked')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists schedule_events_user_start_idx
  on public.schedule_events (user_id, start_at);

create index if not exists schedule_events_customer_idx
  on public.schedule_events (customer_id);

create index if not exists schedule_events_job_idx
  on public.schedule_events (job_id);

alter table public.schedule_events enable row level security;

drop policy if exists "Pro users can view their schedule" on public.schedule_events;
create policy "Pro users can view their schedule"
  on public.schedule_events for select
  using (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
  );

drop policy if exists "Pro users can create schedule events" on public.schedule_events;
create policy "Pro users can create schedule events"
  on public.schedule_events for insert
  with check (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
    and (
      customer_id is null
      or exists (
        select 1 from public.customers
        where customers.id = schedule_events.customer_id
          and customers.user_id = auth.uid()
      )
    )
    and (
      job_id is null
      or exists (
        select 1 from public.jobs
        where jobs.id = schedule_events.job_id
          and jobs.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Pro users can update schedule events" on public.schedule_events;
create policy "Pro users can update schedule events"
  on public.schedule_events for update
  using (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
  )
  with check (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
    and (
      customer_id is null
      or exists (
        select 1 from public.customers
        where customers.id = schedule_events.customer_id
          and customers.user_id = auth.uid()
      )
    )
    and (
      job_id is null
      or exists (
        select 1 from public.jobs
        where jobs.id = schedule_events.job_id
          and jobs.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Pro users can delete schedule events" on public.schedule_events;
create policy "Pro users can delete schedule events"
  on public.schedule_events for delete
  using (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
  );

notify pgrst, 'reload schema';

commit;

