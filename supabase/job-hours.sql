alter table public.jobs
  add column if not exists hours_worked numeric(10, 2) not null default 0
  check (hours_worked >= 0);
