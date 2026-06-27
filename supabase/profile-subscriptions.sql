alter table public.profiles
  add column if not exists plan text,
  add column if not exists subscription_status text,
  add column if not exists trial_expires_at timestamptz,
  add column if not exists paypal_subscription_id text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists data_deletion_requested_at timestamptz,
  add column if not exists cookie_consent jsonb;
