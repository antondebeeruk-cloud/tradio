begin;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  drop column if exists role;

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Users can view their own jobs" on public.jobs;
create policy "Users can view their own jobs"
  on public.jobs for select
  using (user_id = auth.uid());

drop policy if exists "Users can create their own jobs" on public.jobs;
create policy "Users can create their own jobs"
  on public.jobs for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own jobs" on public.jobs;
create policy "Users can update their own jobs"
  on public.jobs for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own jobs" on public.jobs;
create policy "Users can delete their own jobs"
  on public.jobs for delete
  using (user_id = auth.uid());

drop policy if exists "Users can view their own job costs" on public.job_costs;
create policy "Users can view their own job costs"
  on public.job_costs for select
  using (user_id = auth.uid());

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

drop table if exists public.admin_support_access_logs cascade;
drop function if exists public.current_profile_role();

commit;
