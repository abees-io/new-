-- Run once in the connected Supabase project's SQL Editor.
begin;
alter table public.miroku_products add column if not exists is_offer boolean not null default false;
notify pgrst, 'reload schema';
commit;
