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

notify pgrst, 'reload schema';
