begin;
create table if not exists public.job_completion_reports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null unique references public.jobs(id) on delete cascade, token uuid not null unique default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft','sent','signed')),
  summary text, work_performed text, materials_used text, recommendations text, completed_by_name text,
  customer_name text, signature_data text, signed_at timestamptz, signed_ip text, sent_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists completion_reports_user_idx on public.job_completion_reports(user_id, created_at desc);
alter table public.job_completion_reports enable row level security;
do $$ declare policy_name text; begin for policy_name in select policyname from pg_policies where schemaname='public' and tablename='job_completion_reports' loop execute format('drop policy if exists %I on public.job_completion_reports',policy_name); end loop; end $$;
create policy "Workspace members can view completion reports" on public.job_completion_reports for select using(user_id=public.current_workspace_owner_id());
create policy "Workspace members can create completion reports" on public.job_completion_reports for insert with check(user_id=public.current_workspace_owner_id());
create policy "Workspace members can update completion reports" on public.job_completion_reports for update using(user_id=public.current_workspace_owner_id()) with check(user_id=public.current_workspace_owner_id());
create policy "Workspace members can delete completion reports" on public.job_completion_reports for delete using(user_id=public.current_workspace_owner_id());
drop trigger if exists workspace_activity_trigger on public.job_completion_reports;
create trigger workspace_activity_trigger after insert or update or delete on public.job_completion_reports for each row execute function public.log_workspace_record_change();
notify pgrst,'reload schema';
commit;
