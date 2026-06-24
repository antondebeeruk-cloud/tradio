create table if not exists public.job_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  cost_type text not null default 'receipt'
    check (cost_type in ('receipt', 'supplier_invoice')),
  purchase_type text not null default 'product'
    check (purchase_type in ('product', 'service')),
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

create index if not exists job_costs_user_id_idx on public.job_costs (user_id);
create index if not exists job_costs_job_id_idx on public.job_costs (job_id);
create index if not exists job_costs_purchase_date_idx
  on public.job_costs (user_id, purchase_date desc);

alter table public.job_costs enable row level security;

drop policy if exists "Users can view their own job costs" on public.job_costs;
create policy "Users can view their own job costs"
  on public.job_costs for select
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
            and profiles.plan = 'trial'
            and profiles.trial_expires_at > now()
          )
        )
    )
  );

drop policy if exists "Users can create their own job costs" on public.job_costs;
create policy "Users can create their own job costs"
  on public.job_costs for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.jobs
      where jobs.id = job_costs.job_id
        and jobs.user_id = auth.uid()
    )
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
            and profiles.plan = 'trial'
            and profiles.trial_expires_at > now()
          )
        )
    )
  );

drop policy if exists "Users can update their own job costs" on public.job_costs;
create policy "Users can update their own job costs"
  on public.job_costs for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.jobs
      where jobs.id = job_costs.job_id
        and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own job costs" on public.job_costs;
create policy "Users can delete their own job costs"
  on public.job_costs for delete
  using (user_id = auth.uid());
