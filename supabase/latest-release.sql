alter table public.profiles
  add column if not exists billing_interval text,
  add column if not exists pending_plan text,
  add column if not exists pending_billing_interval text,
  add column if not exists pending_paypal_subscription_id text;

alter table public.jobs
  add column if not exists job_type text,
  add column if not exists hours_worked numeric(10, 2) not null default 0;

alter table public.profiles
  drop constraint if exists profiles_billing_interval_check,
  drop constraint if exists profiles_plan_check,
  drop constraint if exists profiles_pending_plan_check,
  drop constraint if exists profiles_pending_billing_interval_check;

alter table public.profiles
  add constraint profiles_billing_interval_check
    check (billing_interval is null or billing_interval in ('monthly', 'annual')),
  add constraint profiles_plan_check
    check (plan is null or plan in ('trial', 'lite', 'pro', 'elite')),
  add constraint profiles_pending_plan_check
    check (pending_plan is null or pending_plan in ('lite', 'pro', 'elite')),
  add constraint profiles_pending_billing_interval_check
    check (
      pending_billing_interval is null
      or pending_billing_interval in ('monthly', 'annual')
    );

alter table public.jobs
  drop constraint if exists jobs_hours_worked_check;

alter table public.jobs
  add constraint jobs_hours_worked_check
    check (hours_worked >= 0);

create index if not exists jobs_job_type_idx
  on public.jobs (user_id, job_type);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id) on delete cascade,
  target_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_admin_audit_logs_admin_idx
  on public.platform_admin_audit_logs (admin_user_id, created_at desc);

create index if not exists platform_admin_audit_logs_target_idx
  on public.platform_admin_audit_logs (target_user_id, created_at desc);

alter table public.platform_admins enable row level security;
alter table public.platform_admin_audit_logs enable row level security;

revoke all on public.platform_admins from anon, authenticated;
revoke all on public.platform_admin_audit_logs from anon, authenticated;


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


create table if not exists public.job_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  category text not null check (category in ('photo', 'document')),
  file_name text not null,
  file_path text not null unique,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 15728640),
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists job_attachments_job_idx
  on public.job_attachments (job_id, created_at desc);
create index if not exists job_attachments_user_idx
  on public.job_attachments (user_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-attachments',
  'job-attachments',
  false,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.job_attachments enable row level security;

drop policy if exists "Pro users can view their own job attachments" on public.job_attachments;
create policy "Pro users can view their own job attachments"
  on public.job_attachments for select
  using (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
  );

drop policy if exists "Pro users can create their own job attachments" on public.job_attachments;
create policy "Pro users can create their own job attachments"
  on public.job_attachments for insert
  with check (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
    and exists (
      select 1 from public.jobs
      where jobs.id = job_attachments.job_id
        and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Pro users can update their own job attachments" on public.job_attachments;
create policy "Pro users can update their own job attachments"
  on public.job_attachments for update
  using (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
  )
  with check (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
    and exists (
      select 1 from public.jobs
      where jobs.id = job_attachments.job_id
        and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Pro users can delete their own job attachments" on public.job_attachments;
create policy "Pro users can delete their own job attachments"
  on public.job_attachments for delete
  using (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
  );

drop policy if exists "Pro users can view their own job files" on storage.objects;
create policy "Pro users can view their own job files"
  on storage.objects for select
  using (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_has_pro_access()
  );

drop policy if exists "Pro users can upload their own job files" on storage.objects;
create policy "Pro users can upload their own job files"
  on storage.objects for insert
  with check (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_has_pro_access()
  );

drop policy if exists "Pro users can delete their own job files" on storage.objects;
create policy "Pro users can delete their own job files"
  on storage.objects for delete
  using (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_has_pro_access()
  );

notify pgrst, 'reload schema';
