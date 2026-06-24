create table if not exists public.customer_portal_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null check (document_type in ('quote', 'invoice')),
  quote_id uuid references public.quotes (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete cascade,
  token text not null unique,
  customer_email text,
  last_viewed_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (document_type = 'quote' and quote_id is not null and invoice_id is null)
    or
    (document_type = 'invoice' and invoice_id is not null and quote_id is null)
  ),
  unique (document_type, quote_id),
  unique (document_type, invoice_id)
);

create index if not exists customer_portal_links_user_id_idx
  on public.customer_portal_links (user_id);

create index if not exists customer_portal_links_token_idx
  on public.customer_portal_links (token);

alter table public.customer_portal_links enable row level security;

drop policy if exists "Users can view their own customer portal links"
  on public.customer_portal_links;
create policy "Users can view their own customer portal links"
  on public.customer_portal_links for select
  using (user_id = auth.uid());

drop policy if exists "Users can create their own customer portal links"
  on public.customer_portal_links;
create policy "Users can create their own customer portal links"
  on public.customer_portal_links for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own customer portal links"
  on public.customer_portal_links;
create policy "Users can update their own customer portal links"
  on public.customer_portal_links for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own customer portal links"
  on public.customer_portal_links;
create policy "Users can delete their own customer portal links"
  on public.customer_portal_links for delete
  using (user_id = auth.uid());
