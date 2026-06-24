create table if not exists public.xero_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tenant_id text not null,
  tenant_name text,
  tenant_type text,
  token_set jsonb not null,
  scopes text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.xero_connections enable row level security;

drop policy if exists "Users cannot directly read Xero tokens"
  on public.xero_connections;

drop policy if exists "Users cannot directly change Xero tokens"
  on public.xero_connections;

create index if not exists xero_connections_tenant_id_idx
  on public.xero_connections (tenant_id);
