begin;
-- NULL preserves existing products as "delivery not set", rather than assuming free.
alter table public.miroku_products add column if not exists delivery_fee numeric(10,2);
alter table public.miroku_products drop constraint if exists miroku_products_delivery_check;
alter table public.miroku_products add constraint miroku_products_delivery_check
 check(delivery_fee is null or delivery_fee between 0 and 100000);
notify pgrst, 'reload schema';
commit;
