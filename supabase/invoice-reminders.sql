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

create index if not exists invoice_reminders_user_id_idx
  on public.invoice_reminders (user_id, sent_at desc);

create index if not exists invoice_reminders_invoice_id_idx
  on public.invoice_reminders (invoice_id, sent_at desc);

alter table public.invoice_reminders enable row level security;

drop policy if exists "Users can view their own invoice reminders"
  on public.invoice_reminders;
create policy "Users can view their own invoice reminders"
  on public.invoice_reminders for select
  using (user_id = auth.uid());

drop policy if exists "Users can create their own invoice reminders"
  on public.invoice_reminders;
create policy "Users can create their own invoice reminders"
  on public.invoice_reminders for insert
  with check (user_id = auth.uid());
