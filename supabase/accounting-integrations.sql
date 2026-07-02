create table if not exists public.accounting_connections (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('sage', 'quickbooks')),
  organisation_id text not null,
  organisation_name text,
  encrypted_token_set jsonb not null,
  scopes text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create index if not exists accounting_connections_organisation_idx
  on public.accounting_connections (provider, organisation_id);

alter table public.accounting_connections enable row level security;

-- No client policies are intentionally created. OAuth tokens are only read and
-- written by Tradio's server-side service-role client.

create table if not exists public.accounting_integration_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  provider text not null check (provider in ('sage', 'quickbooks')),
  action text not null,
  status text not null check (status in ('success', 'failure')),
  message text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists accounting_integration_audit_user_idx
  on public.accounting_integration_audit_logs (user_id, created_at desc);

alter table public.accounting_integration_audit_logs enable row level security;

-- Audit records are also service-role only and cannot be changed by browsers.
