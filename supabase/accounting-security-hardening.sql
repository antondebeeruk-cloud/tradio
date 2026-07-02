-- Run once in Supabase SQL Editor before reconnecting QuickBooks.
-- Existing QuickBooks connections are removed because their realm IDs were
-- stored before encrypted company identifiers were introduced.

alter table public.accounting_connections
  add column if not exists encrypted_organisation_id jsonb;

alter table public.accounting_connections
  alter column organisation_id drop not null;

delete from public.accounting_connections
where provider = 'quickbooks';

drop index if exists public.accounting_connections_organisation_idx;

comment on column public.accounting_connections.encrypted_organisation_id is
  'AES-256-GCM encrypted provider organisation identifier; encrypted by the Tradio server.';
