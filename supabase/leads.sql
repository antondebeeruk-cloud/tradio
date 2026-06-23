alter table public.profiles
  add column if not exists lead_email_slug text,
  add column if not exists lead_email_address text;

create unique index if not exists profiles_lead_email_slug_key
  on public.profiles (lead_email_slug)
  where lead_email_slug is not null;

create unique index if not exists profiles_lead_email_address_key
  on public.profiles (lead_email_address)
  where lead_email_address is not null;

with lead_backfill as (
  select
    profiles.id,
    lower(
      regexp_replace(
        regexp_replace(
          coalesce(
            nullif(profiles.business_name, ''),
            nullif(profiles.full_name, ''),
            nullif(split_part(auth.users.email, '@', 1), ''),
            'tradio-user'
          ),
          '[^a-zA-Z0-9]+',
          '-',
          'g'
        ),
        '(^-|-$)',
        '',
        'g'
      )
    ) || '-' || substr(md5(profiles.id::text), 1, 4) as generated_slug
  from public.profiles
  left join auth.users on auth.users.id = profiles.id
  where profiles.lead_email_address is null
)
update public.profiles
set
  lead_email_slug = left(lead_backfill.generated_slug, 64),
  lead_email_address = left(lead_backfill.generated_slug, 64) || '@tradio.uk',
  updated_at = now()
from lead_backfill
where profiles.id = lead_backfill.id
  and profiles.lead_email_address is null;

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

create index if not exists leads_user_id_idx on public.leads (user_id);
create index if not exists leads_status_idx on public.leads (user_id, status);
create index if not exists leads_received_at_idx on public.leads (user_id, received_at desc);
create index if not exists leads_original_recipient_idx on public.leads (original_recipient);

alter table public.leads enable row level security;

drop policy if exists "Users can view their own leads" on public.leads;
create policy "Users can view their own leads"
  on public.leads for select
  using (user_id = auth.uid());

drop policy if exists "Users can create their own leads" on public.leads;
create policy "Users can create their own leads"
  on public.leads for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own leads" on public.leads;
create policy "Users can update their own leads"
  on public.leads for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own leads" on public.leads;
create policy "Users can delete their own leads"
  on public.leads for delete
  using (user_id = auth.uid());
