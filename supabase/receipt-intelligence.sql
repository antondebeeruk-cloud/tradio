alter table public.job_costs
  add column if not exists category text not null default 'other'
    check (
      category in (
        'materials',
        'labour',
        'subcontractor',
        'hire',
        'fuel',
        'tools',
        'waste',
        'parking',
        'admin',
        'other'
      )
    );

create index if not exists job_costs_category_idx
  on public.job_costs (user_id, category);
