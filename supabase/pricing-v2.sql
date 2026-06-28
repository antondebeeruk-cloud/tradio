alter table public.profiles
  add column if not exists billing_interval text
  check (billing_interval in ('monthly', 'annual'));

alter table public.profiles
  add column if not exists pending_plan text,
  add column if not exists pending_billing_interval text,
  add column if not exists pending_paypal_subscription_id text;

alter table public.profiles
  drop constraint if exists profiles_pending_plan_check,
  drop constraint if exists profiles_pending_billing_interval_check;

alter table public.profiles
  add constraint profiles_pending_plan_check
    check (pending_plan is null or pending_plan in ('lite', 'pro', 'elite')),
  add constraint profiles_pending_billing_interval_check
    check (
      pending_billing_interval is null
      or pending_billing_interval in ('monthly', 'annual')
    );

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan is null or plan in ('trial', 'lite', 'pro', 'elite'));
