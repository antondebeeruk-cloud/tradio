begin;

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (owner_user_id <> user_id)
);

create index if not exists workspace_members_owner_idx
  on public.workspace_members (owner_user_id, status);

alter table public.workspace_members enable row level security;

create table if not exists public.workspace_activity_logs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('created', 'updated', 'deleted', 'invited', 'removed')),
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workspace_activity_owner_idx
  on public.workspace_activity_logs (owner_user_id, created_at desc);

alter table public.workspace_activity_logs enable row level security;

drop policy if exists "Users can view their workspace membership" on public.workspace_members;
create policy "Users can view their workspace membership"
  on public.workspace_members for select
  using (user_id = auth.uid() or owner_user_id = auth.uid());

revoke insert, update, delete on public.workspace_members from anon, authenticated;
revoke insert, update, delete on public.workspace_activity_logs from anon, authenticated;

create or replace function public.current_workspace_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select workspace_members.owner_user_id
      from public.workspace_members
      where workspace_members.user_id = auth.uid()
        and workspace_members.status = 'active'
      limit 1
    ),
    auth.uid()
  );
$$;

revoke all on function public.current_workspace_owner_id() from public;
grant execute on function public.current_workspace_owner_id() to authenticated;

drop policy if exists "Workspace members can view activity" on public.workspace_activity_logs;
create policy "Workspace members can view activity"
  on public.workspace_activity_logs for select
  using (owner_user_id = public.current_workspace_owner_id());

create or replace function public.log_workspace_record_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_data jsonb;
  record_owner uuid;
  record_id uuid;
  activity_action text;
begin
  record_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  record_owner := nullif(record_data ->> 'user_id', '')::uuid;
  record_id := nullif(record_data ->> 'id', '')::uuid;
  activity_action := case tg_op
    when 'INSERT' then 'created'
    when 'UPDATE' then 'updated'
    else 'deleted'
  end;

  if record_owner is not null then
    insert into public.workspace_activity_logs (
      owner_user_id,
      actor_user_id,
      action,
      entity_type,
      entity_id
    ) values (
      record_owner,
      auth.uid(),
      activity_action,
      tg_table_name,
      record_id
    );
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.current_user_has_pro_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = public.current_workspace_owner_id()
      and profiles.subscription_status = 'active'
      and (
        profiles.plan in ('pro', 'elite')
        or (
          profiles.plan = 'trial'
          and profiles.trial_expires_at > now()
        )
      )
  );
$$;

revoke all on function public.current_user_has_pro_access() from public;
grant execute on function public.current_user_has_pro_access() to authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid() or id = public.current_workspace_owner_id());

do $$
declare
  table_name text;
  policy_name text;
  workspace_tables text[] := array[
    'customers', 'quotes', 'quote_items', 'invoices', 'invoice_items',
    'saved_quote_items', 'jobs', 'job_costs', 'leads', 'xero_connections',
    'xero_audit_logs', 'customer_portal_links', 'invoice_reminders'
  ];
begin
  foreach table_name in array workspace_tables loop
    if to_regclass('public.' || table_name) is null then
      continue;
    end if;

    for policy_name in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;

    execute format(
      'create policy %I on public.%I for select using (user_id = public.current_workspace_owner_id())',
      'Workspace members can view ' || table_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert with check (user_id = public.current_workspace_owner_id())',
      'Workspace members can create ' || table_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I for update using (user_id = public.current_workspace_owner_id()) with check (user_id = public.current_workspace_owner_id())',
      'Workspace members can update ' || table_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete using (user_id = public.current_workspace_owner_id())',
      'Workspace members can delete ' || table_name,
      table_name
    );

    execute format('drop trigger if exists workspace_activity_trigger on public.%I', table_name);
    execute format(
      'create trigger workspace_activity_trigger after insert or update or delete on public.%I for each row execute function public.log_workspace_record_change()',
      table_name
    );
  end loop;
end
$$;

do $$
declare
  policy_name text;
begin
  if to_regclass('public.schedule_events') is not null then
    for policy_name in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = 'schedule_events'
    loop
      execute format('drop policy if exists %I on public.schedule_events', policy_name);
    end loop;
  end if;
end
$$;

create policy "Pro workspace members can view schedules"
  on public.schedule_events for select
  using (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access());
create policy "Pro workspace members can create schedules"
  on public.schedule_events for insert
  with check (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access());
create policy "Pro workspace members can update schedules"
  on public.schedule_events for update
  using (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access())
  with check (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access());
create policy "Pro workspace members can delete schedules"
  on public.schedule_events for delete
  using (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access());

do $$
declare
  policy_name text;
begin
  if to_regclass('public.job_attachments') is not null then
    for policy_name in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = 'job_attachments'
    loop
      execute format('drop policy if exists %I on public.job_attachments', policy_name);
    end loop;
  end if;
end
$$;

create policy "Pro workspace members can view job attachments"
  on public.job_attachments for select
  using (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access());
create policy "Pro workspace members can create job attachments"
  on public.job_attachments for insert
  with check (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access());
create policy "Pro workspace members can update job attachments"
  on public.job_attachments for update
  using (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access())
  with check (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access());
create policy "Pro workspace members can delete job attachments"
  on public.job_attachments for delete
  using (user_id = public.current_workspace_owner_id() and public.current_user_has_pro_access());

drop policy if exists "Users can view their own receipt attachments" on storage.objects;
drop policy if exists "Users can upload their own receipt attachments" on storage.objects;
drop policy if exists "Users can delete their own receipt attachments" on storage.objects;
drop policy if exists "Pro users can view their own job files" on storage.objects;
drop policy if exists "Pro users can upload their own job files" on storage.objects;
drop policy if exists "Pro users can delete their own job files" on storage.objects;
drop policy if exists "Workspace members can view receipt files" on storage.objects;
drop policy if exists "Workspace members can upload receipt files" on storage.objects;
drop policy if exists "Workspace members can delete receipt files" on storage.objects;
drop policy if exists "Pro workspace members can view job files" on storage.objects;
drop policy if exists "Pro workspace members can upload job files" on storage.objects;
drop policy if exists "Pro workspace members can delete job files" on storage.objects;

create policy "Workspace members can view receipt files"
  on storage.objects for select
  using (
    bucket_id = 'receipt-attachments'
    and (storage.foldername(name))[1] = public.current_workspace_owner_id()::text
  );
create policy "Workspace members can upload receipt files"
  on storage.objects for insert
  with check (
    bucket_id = 'receipt-attachments'
    and (storage.foldername(name))[1] = public.current_workspace_owner_id()::text
  );
create policy "Workspace members can delete receipt files"
  on storage.objects for delete
  using (
    bucket_id = 'receipt-attachments'
    and (storage.foldername(name))[1] = public.current_workspace_owner_id()::text
  );

create policy "Pro workspace members can view job files"
  on storage.objects for select
  using (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = public.current_workspace_owner_id()::text
    and public.current_user_has_pro_access()
  );
create policy "Pro workspace members can upload job files"
  on storage.objects for insert
  with check (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = public.current_workspace_owner_id()::text
    and public.current_user_has_pro_access()
  );
create policy "Pro workspace members can delete job files"
  on storage.objects for delete
  using (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = public.current_workspace_owner_id()::text
    and public.current_user_has_pro_access()
  );

notify pgrst, 'reload schema';

commit;
