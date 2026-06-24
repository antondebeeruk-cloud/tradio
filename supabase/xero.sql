create table if not exists public.xero_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tenant_id text not null,
  tenant_name text,
  tenant_type text,
  encrypted_token_set jsonb,
  token_set jsonb,
  scopes text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.xero_connections
  add column if not exists encrypted_token_set jsonb;

alter table public.xero_connections
  add column if not exists token_set jsonb;

alter table public.xero_connections
  alter column token_set drop not null;

alter table public.xero_connections enable row level security;

drop policy if exists "Users cannot directly read Xero tokens"
  on public.xero_connections;

drop policy if exists "Users cannot directly change Xero tokens"
  on public.xero_connections;

create index if not exists xero_connections_tenant_id_idx
  on public.xero_connections (tenant_id);

create table if not exists public.xero_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  status text not null check (status in ('success', 'failure')),
  message text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists xero_audit_logs_user_id_idx
  on public.xero_audit_logs (user_id);

create index if not exists xero_audit_logs_created_at_idx
  on public.xero_audit_logs (created_at desc);

alter table public.xero_audit_logs enable row level security;
