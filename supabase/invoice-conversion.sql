create unique index if not exists invoices_user_id_quote_id_idx
  on public.invoices (user_id, quote_id);
