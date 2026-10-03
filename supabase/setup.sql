-- Run as the project owner in Supabase SQL Editor. No secret keys are needed.
begin;
create table if not exists public.miroku_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.miroku_admins enable row level security;
revoke all on public.miroku_admins from anon, authenticated;
grant select on public.miroku_admins to authenticated;
drop policy if exists "Read own admin membership" on public.miroku_admins;
create policy "Read own admin membership" on public.miroku_admins for select to authenticated using (user_id=(select auth.uid()));
create table if not exists public.miroku_products (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(btrim(name)) between 1 and 120),
 category text not null check (char_length(btrim(category)) between 1 and 60),
 description text not null check (char_length(btrim(description)) between 1 and 3000),
 color text not null default '' check (char_length(color)<=80),
 tag text not null default '' check (char_length(tag)<=40),
 price numeric(12,2) not null check (price>0 and price<=10000000),
 stock integer not null default 0 check (stock between 0 and 1000000),
 image text not null check (image ~ '^https://'),
 published boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.miroku_products enable row level security;
revoke all on public.miroku_products from anon, authenticated;
grant select on public.miroku_products to anon, authenticated;
grant insert, update, delete on public.miroku_products to authenticated;
drop policy if exists "Published product browsing" on public.miroku_products;
create policy "Published product browsing" on public.miroku_products for select to anon, authenticated using (published);
drop policy if exists "Admin product management" on public.miroku_products;
create policy "Admin product management" on public.miroku_products for all to authenticated
 using (exists(select 1 from public.miroku_admins where user_id=(select auth.uid())))
 with check (exists(select 1 from public.miroku_admins where user_id=(select auth.uid())));
create index if not exists miroku_products_published_created on public.miroku_products (published,created_at desc);
insert into public.miroku_admins(user_id)
 select id from auth.users where lower(email)='murokireview@gmail.com' and email_confirmed_at is not null
 on conflict do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('miroku-product-images','miroku-product-images',true,5242880,array['image/webp','image/jpeg','image/png'])
 on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/webp','image/jpeg','image/png'];
drop policy if exists "MIROKU admin uploads" on storage.objects;
create policy "MIROKU admin uploads" on storage.objects for insert to authenticated
 with check(bucket_id='miroku-product-images' and exists(select 1 from public.miroku_admins where user_id=(select auth.uid())));
drop policy if exists "MIROKU admin image reads" on storage.objects;
create policy "MIROKU admin image reads" on storage.objects for select to authenticated
 using(bucket_id='miroku-product-images' and exists(select 1 from public.miroku_admins where user_id=(select auth.uid())));
drop policy if exists "MIROKU admin image cleanup" on storage.objects;
create policy "MIROKU admin image cleanup" on storage.objects for delete to authenticated
 using(bucket_id='miroku-product-images' and exists(select 1 from public.miroku_admins where user_id=(select auth.uid())));
commit;
-- Must return one row. If empty, create/confirm the admin Auth user, then rerun.
select a.user_id,u.email from public.miroku_admins a join auth.users u on u.id=a.user_id;

-- Optional original-price support (also safe when upgrading existing stores).
alter table public.miroku_products add column if not exists compare_at_price numeric(12,2);
alter table public.miroku_products drop constraint if exists miroku_products_compare_price_check;
alter table public.miroku_products add constraint miroku_products_compare_price_check check(compare_at_price is null or (compare_at_price>=price and compare_at_price<=10000000));
