alter table public.profiles
  add column if not exists business_address_line_1 text,
  add column if not exists business_address_line_2 text,
  add column if not exists business_town text,
  add column if not exists business_postcode text,
  add column if not exists vat_number text;
