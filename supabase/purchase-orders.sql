begin;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  job_id uuid references public.jobs (id) on delete set null,
  purchase_order_number text not null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'partially_received', 'received', 'cancelled')),
  order_date date not null default current_date,
  expected_date date,
  supplier_reference text,
  notes text,
  subtotal numeric(12, 2) not null default 0,
  vat_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, purchase_order_number)
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  description text not null,
  quantity numeric(12, 2) not null check (quantity > 0),
  quantity_received numeric(12, 2) not null default 0 check (quantity_received >= 0),
  unit_cost numeric(12, 2) not null check (unit_cost >= 0),
  vat_rate numeric(6, 2) not null default 20 check (vat_rate >= 0),
  line_subtotal numeric(12, 2) not null,
  vat_amount numeric(12, 2) not null,
  line_total numeric(12, 2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.job_costs
  add column if not exists source_purchase_order_item_id uuid
    references public.purchase_order_items (id) on delete set null;

create unique index if not exists job_costs_purchase_order_item_unique
  on public.job_costs (source_purchase_order_item_id)
  where source_purchase_order_item_id is not null;
create index if not exists suppliers_user_name_idx on public.suppliers (user_id, name);
create index if not exists purchase_orders_user_date_idx on public.purchase_orders (user_id, order_date desc);
create index if not exists purchase_orders_job_idx on public.purchase_orders (job_id);
create index if not exists purchase_order_items_order_idx on public.purchase_order_items (purchase_order_id, sort_order);

alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array['suppliers', 'purchase_orders', 'purchase_order_items'] loop
    for policy_name in
      select policyname from pg_policies where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;
    execute format('create policy %I on public.%I for select using (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access())', 'Pro workspace members can view ' || table_name, table_name);
    execute format('create policy %I on public.%I for insert with check (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access())', 'Pro workspace members can create ' || table_name, table_name);
    execute format('create policy %I on public.%I for update using (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access()) with check (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access())', 'Pro workspace members can update ' || table_name, table_name);
    execute format('create policy %I on public.%I for delete using (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access())', 'Pro workspace members can delete ' || table_name, table_name);
    execute format('drop trigger if exists workspace_activity_trigger on public.%I', table_name);
    execute format('create trigger workspace_activity_trigger after insert or update or delete on public.%I for each row execute function public.log_workspace_record_change()', table_name);
  end loop;
end
$$;

notify pgrst, 'reload schema';
commit;
