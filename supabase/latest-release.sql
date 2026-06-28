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

notify pgrst, 'reload schema';
