alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists cancelled_at timestamptz,
  add column if not exists data_deletion_requested_at timestamptz,
  add column if not exists cookie_consent jsonb;

update public.profiles
set role = 'user'
where role is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user', 'admin'));
  end if;
end $$;

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

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert
  with check (id = auth.uid() and role = 'user');

drop policy if exists "Users can update their own profile" on public.profiles;
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
            and profiles.plan = 'trial'
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
            and profiles.plan = 'trial'
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
            and profiles.plan = 'trial'
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
            and profiles.plan = 'trial'
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
            and profiles.plan = 'trial'
            and profiles.trial_expires_at > now()
          )
        )
    )
  );
