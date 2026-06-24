create table if not exists public.job_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
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

alter table public.job_costs
  alter column job_id drop not null;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'job_costs'
      and constraint_name = 'job_costs_job_id_fkey'
  ) then
    alter table public.job_costs drop constraint job_costs_job_id_fkey;
  end if;
end $$;

alter table public.job_costs
  add constraint job_costs_job_id_fkey
  foreign key (job_id)
  references public.jobs (id)
  on delete set null;

create index if not exists job_costs_user_id_idx on public.job_costs (user_id);
create index if not exists job_costs_job_id_idx on public.job_costs (job_id);
create index if not exists job_costs_purchase_date_idx
  on public.job_costs (user_id, purchase_date desc);

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

alter table public.job_costs enable row level security;

drop policy if exists "Users can view their own receipt attachments" on storage.objects;
create policy "Users can view their own receipt attachments"
  on storage.objects for select
  using (
    bucket_id = 'receipt-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can upload their own receipt attachments" on storage.objects;
create policy "Users can upload their own receipt attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'receipt-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own receipt attachments" on storage.objects;
create policy "Users can delete their own receipt attachments"
  on storage.objects for delete
  using (
    bucket_id = 'receipt-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

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

drop policy if exists "Users can delete their own job costs" on public.job_costs;
create policy "Users can delete their own job costs"
  on public.job_costs for delete
  using (user_id = auth.uid());
