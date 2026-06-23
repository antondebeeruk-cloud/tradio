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

create index if not exists jobs_user_id_idx on public.jobs (user_id);
create index if not exists jobs_customer_id_idx on public.jobs (customer_id);
create index if not exists jobs_status_idx on public.jobs (user_id, status);

alter table public.jobs enable row level security;

drop policy if exists "Users can view their own jobs" on public.jobs;
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

drop policy if exists "Users can create their own jobs" on public.jobs;
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

drop policy if exists "Users can update their own jobs" on public.jobs;
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

drop policy if exists "Users can delete their own jobs" on public.jobs;
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
