alter table public.profiles
  add column if not exists cancelled_at timestamptz,
  add column if not exists data_deletion_requested_at timestamptz,
  add column if not exists cookie_consent jsonb;

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
