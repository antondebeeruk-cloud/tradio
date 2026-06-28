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
  lead_email_slug text unique,
  lead_email_address text unique,
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

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid not null,
  title text not null,
  job_type text,
  hours_worked numeric(10, 2) not null default 0 check (hours_worked >= 0),
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

create table if not exists public.job_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  cost_type text not null default 'receipt'
    check (cost_type in ('receipt', 'supplier_invoice')),
  purchase_type text not null default 'product'
    check (purchase_type in ('product', 'service')),
  category text not null default 'other'
    check (
      category in (
        'materials',
        'labour',
        'subcontractor',
        'hire',
        'fuel',
        'tools',
        'waste',
        'parking',
        'admin',
        'other'
      )
    ),
  supplier_name text,
  document_reference text,
  purchase_date date not null default current_date,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_cost numeric(12, 2) not null default 0 check (unit_cost >= 0),
  subtotal numeric(12, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 0 check (vat_rate >= 0),
  vat_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  attachment_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lead_email_address text,
  original_recipient text,
  from_email text,
  from_name text,
  subject text,
  body_text text,
  body_html text,
  phone text,
  customer_name text,
  postcode text,
  job_description text,
  source_platform text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'quoted', 'won', 'lost', 'spam')),
  raw_email jsonb,
  email_message_id text unique,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

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

create table if not exists public.invoice_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  customer_email text not null,
  reminder_type text not null default 'manual'
    check (reminder_type in ('manual', 'automatic')),
  status text not null default 'sent'
    check (status in ('sent', 'failed')),
  message text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
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
create index if not exists jobs_job_type_idx on public.jobs (user_id, job_type);
create index if not exists job_costs_user_id_idx on public.job_costs (user_id);
create index if not exists job_costs_job_id_idx on public.job_costs (job_id);
create index if not exists job_costs_purchase_date_idx on public.job_costs (user_id, purchase_date desc);
create index if not exists job_costs_category_idx on public.job_costs (user_id, category);
create index if not exists saved_quote_items_user_id_idx on public.saved_quote_items (user_id, name);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipt-attachments',
  'receipt-attachments',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create index if not exists leads_user_id_idx on public.leads (user_id);
create index if not exists leads_status_idx on public.leads (user_id, status);
create index if not exists leads_received_at_idx on public.leads (user_id, received_at desc);
create index if not exists leads_original_recipient_idx on public.leads (original_recipient);
create index if not exists xero_connections_tenant_id_idx on public.xero_connections (tenant_id);
create index if not exists xero_audit_logs_user_id_idx on public.xero_audit_logs (user_id);
create index if not exists xero_audit_logs_created_at_idx on public.xero_audit_logs (created_at desc);
create index if not exists customer_portal_links_user_id_idx
  on public.customer_portal_links (user_id);
create index if not exists customer_portal_links_token_idx
  on public.customer_portal_links (token);
create index if not exists invoice_reminders_user_id_idx
  on public.invoice_reminders (user_id, sent_at desc);
create index if not exists invoice_reminders_invoice_id_idx
  on public.invoice_reminders (invoice_id, sent_at desc);
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.jobs enable row level security;
alter table public.job_costs enable row level security;
alter table public.saved_quote_items enable row level security;
alter table public.leads enable row level security;
alter table public.xero_connections enable row level security;
alter table public.xero_audit_logs enable row level security;
alter table public.customer_portal_links enable row level security;
alter table public.invoice_reminders enable row level security;

create policy "Users can view their own receipt attachments"
  on storage.objects for select
  using (
    bucket_id = 'receipt-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload their own receipt attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'receipt-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own receipt attachments"
  on storage.objects for delete
  using (
    bucket_id = 'receipt-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can create their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

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

create policy "Users can view their own saved quote items"
  on public.saved_quote_items for select
  using (user_id = auth.uid());

create policy "Users can create their own saved quote items"
  on public.saved_quote_items for insert
  with check (user_id = auth.uid());

create policy "Users can update their own saved quote items"
  on public.saved_quote_items for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own saved quote items"
  on public.saved_quote_items for delete
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

create policy "Users can view their own customer portal links"
  on public.customer_portal_links for select
  using (user_id = auth.uid());

create policy "Users can create their own customer portal links"
  on public.customer_portal_links for insert
  with check (user_id = auth.uid());

create policy "Users can update their own customer portal links"
  on public.customer_portal_links for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own customer portal links"
  on public.customer_portal_links for delete
  using (user_id = auth.uid());

create policy "Users can view their own invoice reminders"
  on public.invoice_reminders for select
  using (user_id = auth.uid());

create policy "Users can create their own invoice reminders"
  on public.invoice_reminders for insert
  with check (user_id = auth.uid());

create policy "Users can view their own jobs"
  on public.jobs for select
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and (
          (
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
          (
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
          (
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
          (
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
          (
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

create policy "Users can view their own job costs"
  on public.job_costs for select
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and (
          (
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

create policy "Users can create their own job costs"
  on public.job_costs for insert
  with check (
    user_id = auth.uid()
    and (
      job_id is null
      or exists (
        select 1
        from public.jobs
        where jobs.id = job_costs.job_id
          and jobs.user_id = auth.uid()
      )
    )
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and (
          (
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

create policy "Users can update their own job costs"
  on public.job_costs for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      job_id is null
      or exists (
        select 1
        from public.jobs
        where jobs.id = job_costs.job_id
          and jobs.user_id = auth.uid()
      )
    )
  );

create policy "Users can delete their own job costs"
  on public.job_costs for delete
  using (user_id = auth.uid());

create policy "Users can view their own leads"
  on public.leads for select
  using (user_id = auth.uid());

create policy "Users can create their own leads"
  on public.leads for insert
  with check (user_id = auth.uid());

create policy "Users can update their own leads"
  on public.leads for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own leads"
  on public.leads for delete
  using (user_id = auth.uid());


-- All signed-in users can use Jobs and Receipts. RLS still isolates each user.
drop policy if exists "Users can view their own jobs" on public.jobs;
create policy "Users can view their own jobs"
  on public.jobs for select using (user_id = auth.uid());

drop policy if exists "Users can create their own jobs" on public.jobs;
create policy "Users can create their own jobs"
  on public.jobs for insert with check (user_id = auth.uid());

drop policy if exists "Users can update their own jobs" on public.jobs;
create policy "Users can update their own jobs"
  on public.jobs for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own jobs" on public.jobs;
create policy "Users can delete their own jobs"
  on public.jobs for delete using (user_id = auth.uid());

drop policy if exists "Users can view their own job costs" on public.job_costs;
create policy "Users can view their own job costs"
  on public.job_costs for select using (user_id = auth.uid());

drop policy if exists "Users can create their own job costs" on public.job_costs;
create policy "Users can create their own job costs"
  on public.job_costs for insert
  with check (
    user_id = auth.uid()
    and (
      job_id is null
      or exists (
        select 1 from public.jobs
        where jobs.id = job_costs.job_id
          and jobs.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can update their own job costs" on public.job_costs;
create policy "Users can update their own job costs"
  on public.job_costs for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      job_id is null
      or exists (
        select 1 from public.jobs
        where jobs.id = job_costs.job_id
          and jobs.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can delete their own job costs" on public.job_costs;
create policy "Users can delete their own job costs"
  on public.job_costs for delete using (user_id = auth.uid());
