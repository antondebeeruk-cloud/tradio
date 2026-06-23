alter table public.invoices
  drop constraint if exists invoices_status_check;

update public.invoices
set status = case
  when status = 'paid' then 'paid'
  when status = 'overdue' then 'overdue'
  else 'unpaid'
end;

alter table public.invoices
  alter column status set default 'unpaid';

alter table public.invoices
  add constraint invoices_status_check
  check (status in ('unpaid', 'paid', 'overdue'));
