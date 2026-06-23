create table if not exists public.admin_support_access_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id) on delete cascade,
  target_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_support_access_logs_admin_user_id_idx
  on public.admin_support_access_logs (admin_user_id);

create index if not exists admin_support_access_logs_target_user_id_idx
  on public.admin_support_access_logs (target_user_id);

create index if not exists admin_support_access_logs_created_at_idx
  on public.admin_support_access_logs (created_at desc);

alter table public.admin_support_access_logs enable row level security;

drop policy if exists "Admins can view support access logs"
  on public.admin_support_access_logs;

drop policy if exists "Admins can create support access logs"
  on public.admin_support_access_logs;

create policy "Admins can view support access logs"
  on public.admin_support_access_logs for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admins can create support access logs"
  on public.admin_support_access_logs for insert
  with check (
    admin_user_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
