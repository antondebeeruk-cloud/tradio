alter table public.jobs
  add column if not exists job_type text;

create index if not exists jobs_job_type_idx
  on public.jobs (user_id, job_type);

notify pgrst, 'reload schema';
