create table if not exists public.saved_quote_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null,
  item_type text not null default 'service'
    check (item_type in ('service', 'product', 'fee')),
  default_quantity numeric(10, 2) not null default 1 check (default_quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists saved_quote_items_user_id_idx
  on public.saved_quote_items (user_id, name);

alter table public.saved_quote_items enable row level security;

drop policy if exists "Users can view their own saved quote items"
  on public.saved_quote_items;
create policy "Users can view their own saved quote items"
  on public.saved_quote_items for select
  using (user_id = auth.uid());

drop policy if exists "Users can create their own saved quote items"
  on public.saved_quote_items;
create policy "Users can create their own saved quote items"
  on public.saved_quote_items for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own saved quote items"
  on public.saved_quote_items;
create policy "Users can update their own saved quote items"
  on public.saved_quote_items for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own saved quote items"
  on public.saved_quote_items;
create policy "Users can delete their own saved quote items"
  on public.saved_quote_items for delete
  using (user_id = auth.uid());
