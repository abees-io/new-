-- Run once in the connected Supabase project's SQL Editor.
begin;
alter table public.miroku_products add column if not exists compare_at_price numeric(12,2);
alter table public.miroku_products drop constraint if exists miroku_products_compare_price_check;
alter table public.miroku_products add constraint miroku_products_compare_price_check
 check(compare_at_price is null or (compare_at_price>=price and compare_at_price<=10000000));
notify pgrst, 'reload schema';
commit;
