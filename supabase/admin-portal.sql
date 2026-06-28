begin;

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

commit;

