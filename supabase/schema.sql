create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  business_name text,
  trade text,
  phone text,
  logo_url text,
  business_address_line_1 text,
  business_address_line_2 text,
  business_town text,
  business_postcode text,
  vat_number text,
  role text not null default 'user'
    check (role in ('user', 'admin')),
  plan text,
  subscription_status text,
  trial_expires_at timestamptz,
  paypal_subscription_id text,
  cancelled_at timestamptz,
  data_deletion_requested_at timestamptz,
  cookie_consent jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  town text,
  postcode text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid not null,
  quote_number text not null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'rejected')),
  issue_date date not null default current_date,
  expiry_date date,
  subtotal numeric(12, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 0,
  vat_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, quote_number),
  foreign key (customer_id, user_id)
    references public.customers (id, user_id)
    on delete restrict
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quote_id uuid not null,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  line_total numeric(12, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (quote_id, user_id)
    references public.quotes (id, user_id)
    on delete cascade
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid not null,
  quote_id uuid,
  invoice_number text not null,
  status text not null default 'unpaid'
    check (status in ('unpaid', 'paid', 'overdue')),
  issue_date date not null default current_date,
  due_date date,
  subtotal numeric(12, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 0,
  vat_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, invoice_number),
  unique (user_id, quote_id),
  foreign key (customer_id, user_id)
    references public.customers (id, user_id)
    on delete restrict,
  foreign key (quote_id, user_id)
    references public.quotes (id, user_id)
    on delete restrict
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  line_total numeric(12, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (invoice_id, user_id)
    references public.invoices (id, user_id)
    on delete cascade
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid not null,
  title text not null,
  description text,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed', 'cancelled')),
  start_date date,
  due_date date,
  completed_at timestamptz,
  related_quote_id uuid,
  related_invoice_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, user_id)
    references public.customers (id, user_id)
    on delete cascade,
  foreign key (related_quote_id)
    references public.quotes (id)
    on delete set null,
  foreign key (related_invoice_id)
    references public.invoices (id)
    on delete set null
);

create index if not exists customers_user_id_idx on public.customers (user_id);
create index if not exists quotes_user_id_idx on public.quotes (user_id);
create index if not exists quotes_customer_id_idx on public.quotes (customer_id);
create index if not exists quote_items_quote_id_idx on public.quote_items (quote_id);
create index if not exists invoices_user_id_idx on public.invoices (user_id);
create index if not exists invoices_customer_id_idx on public.invoices (customer_id);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id);
create index if not exists jobs_user_id_idx on public.jobs (user_id);
create index if not exists jobs_customer_id_idx on public.jobs (customer_id);
create index if not exists jobs_status_idx on public.jobs (user_id, status);

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.jobs enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can create their own profile"
  on public.profiles for insert
  with check (id = auth.uid() and role = 'user');

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and (
      role = public.current_profile_role()
      or public.current_profile_role() = 'admin'
    )
  );

create policy "Users can delete their own profile"
  on public.profiles for delete
  using (id = auth.uid());

create policy "Users can view their own customers"
  on public.customers for select
  using (user_id = auth.uid());

create policy "Users can create their own customers"
  on public.customers for insert
  with check (user_id = auth.uid());

create policy "Users can update their own customers"
  on public.customers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own customers"
  on public.customers for delete
  using (user_id = auth.uid());

create policy "Users can view their own quotes"
  on public.quotes for select
  using (user_id = auth.uid());

create policy "Users can create their own quotes"
  on public.quotes for insert
  with check (user_id = auth.uid());

create policy "Users can update their own quotes"
  on public.quotes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own quotes"
  on public.quotes for delete
  using (user_id = auth.uid());

create policy "Users can view their own quote items"
  on public.quote_items for select
  using (user_id = auth.uid());

create policy "Users can create their own quote items"
  on public.quote_items for insert
  with check (user_id = auth.uid());

create policy "Users can update their own quote items"
  on public.quote_items for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own quote items"
  on public.quote_items for delete
  using (user_id = auth.uid());

create policy "Users can view their own invoices"
  on public.invoices for select
  using (user_id = auth.uid());

create policy "Users can create their own invoices"
  on public.invoices for insert
  with check (user_id = auth.uid());

create policy "Users can update their own invoices"
  on public.invoices for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own invoices"
  on public.invoices for delete
  using (user_id = auth.uid());

create policy "Users can view their own invoice items"
  on public.invoice_items for select
  using (user_id = auth.uid());

create policy "Users can create their own invoice items"
  on public.invoice_items for insert
  with check (user_id = auth.uid());

create policy "Users can update their own invoice items"
  on public.invoice_items for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own invoice items"
  on public.invoice_items for delete
  using (user_id = auth.uid());

create policy "Users can view their own jobs"
  on public.jobs for select
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and (
          profiles.role = 'admin'
          or (
            profiles.subscription_status = 'active'
            and profiles.plan = 'elite'
          )
          or (
            profiles.subscription_status = 'active'
            and
            profiles.plan = 'trial'
            and profiles.trial_expires_at > now()
          )
        )
    )
  );

create policy "Users can create their own jobs"
  on public.jobs for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and (
          profiles.role = 'admin'
          or (
            profiles.subscription_status = 'active'
            and profiles.plan = 'elite'
          )
          or (
            profiles.subscription_status = 'active'
            and
            profiles.plan = 'trial'
            and profiles.trial_expires_at > now()
          )
        )
    )
  );

create policy "Users can update their own jobs"
  on public.jobs for update
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and (
          profiles.role = 'admin'
          or (
            profiles.subscription_status = 'active'
            and profiles.plan = 'elite'
          )
          or (
            profiles.subscription_status = 'active'
            and
            profiles.plan = 'trial'
            and profiles.trial_expires_at > now()
          )
        )
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and (
          profiles.role = 'admin'
          or (
            profiles.subscription_status = 'active'
            and profiles.plan = 'elite'
          )
          or (
            profiles.subscription_status = 'active'
            and
            profiles.plan = 'trial'
            and profiles.trial_expires_at > now()
          )
        )
    )
  );

create policy "Users can delete their own jobs"
  on public.jobs for delete
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and (
          profiles.role = 'admin'
          or (
            profiles.subscription_status = 'active'
            and profiles.plan = 'elite'
          )
          or (
            profiles.subscription_status = 'active'
            and
            profiles.plan = 'trial'
            and profiles.trial_expires_at > now()
          )
        )
    )
  );
