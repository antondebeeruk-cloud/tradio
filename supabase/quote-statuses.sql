alter table public.quotes
  drop constraint if exists quotes_status_check;

update public.quotes
set status = 'rejected'
where status not in ('draft', 'sent', 'accepted', 'rejected');

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'rejected'));
