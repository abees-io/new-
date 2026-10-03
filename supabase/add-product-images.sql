-- Adds up to four product photo URLs; existing cover photos are preserved.
begin;
alter table public.miroku_products add column if not exists images text[] not null default '{}';
update public.miroku_products set images=array[image] where cardinality(images)=0;
alter table public.miroku_products drop constraint if exists miroku_products_images_check;
alter table public.miroku_products add constraint miroku_products_images_check
 check(cardinality(images) between 1 and 4 and array_position(images,null) is null and image=images[1]);
notify pgrst, 'reload schema';
commit;
