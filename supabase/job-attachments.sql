begin;

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
    where profiles.id = auth.uid()
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

create table if not exists public.job_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  category text not null check (category in ('photo', 'document')),
  file_name text not null,
  file_path text not null unique,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 15728640),
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists job_attachments_job_idx
  on public.job_attachments (job_id, created_at desc);

create index if not exists job_attachments_user_idx
  on public.job_attachments (user_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-attachments',
  'job-attachments',
  false,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.job_attachments enable row level security;

drop policy if exists "Pro users can view their own job attachments" on public.job_attachments;
create policy "Pro users can view their own job attachments"
  on public.job_attachments for select
  using (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
  );

drop policy if exists "Pro users can create their own job attachments" on public.job_attachments;
create policy "Pro users can create their own job attachments"
  on public.job_attachments for insert
  with check (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
    and exists (
      select 1 from public.jobs
      where jobs.id = job_attachments.job_id
        and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Pro users can update their own job attachments" on public.job_attachments;
create policy "Pro users can update their own job attachments"
  on public.job_attachments for update
  using (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
  )
  with check (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
    and exists (
      select 1 from public.jobs
      where jobs.id = job_attachments.job_id
        and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Pro users can delete their own job attachments" on public.job_attachments;
create policy "Pro users can delete their own job attachments"
  on public.job_attachments for delete
  using (
    user_id = auth.uid()
    and public.current_user_has_pro_access()
  );

drop policy if exists "Pro users can view their own job files" on storage.objects;
create policy "Pro users can view their own job files"
  on storage.objects for select
  using (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_has_pro_access()
  );

drop policy if exists "Pro users can upload their own job files" on storage.objects;
create policy "Pro users can upload their own job files"
  on storage.objects for insert
  with check (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_has_pro_access()
  );

drop policy if exists "Pro users can delete their own job files" on storage.objects;
create policy "Pro users can delete their own job files"
  on storage.objects for delete
  using (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_has_pro_access()
  );

notify pgrst, 'reload schema';

commit;

