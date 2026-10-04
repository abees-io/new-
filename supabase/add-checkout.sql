-- Run AFTER setup.sql and add-delivery.sql in the connected project's SQL Editor.
begin;
create table if not exists public.miroku_orders (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique,
 customer jsonb not null,
 items jsonb not null,
 amount bigint not null check(amount>0), -- INR paise; includes delivery
 mode text not null check(mode in ('test','live')),
 status text not null default 'pending' check(status in ('pending','paid','paid_review')),
 razorpay_order_id text unique,
 razorpay_payment_id text unique,
 created_at timestamptz not null default now(),
 paid_at timestamptz
);
alter table public.miroku_orders enable row level security;
revoke all on public.miroku_orders from anon, authenticated;
grant select on public.miroku_orders to authenticated;
grant all on public.miroku_orders to service_role;
drop policy if exists "Admin order access" on public.miroku_orders;
create policy "Admin order access" on public.miroku_orders for select to authenticated
 using (exists(select 1 from public.miroku_admins where user_id=(select auth.uid())));
create index if not exists miroku_orders_created on public.miroku_orders(created_at desc);

create or replace function public.miroku_create_order(p_items jsonb,p_customer jsonb,p_token_hash text,p_mode text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o miroku_orders; p miroku_products; i jsonb; snapshot jsonb='[]'; total bigint=0; q integer; held integer;
begin
 -- Serialize the same checkout token and then product rows in a fixed order.
 perform pg_advisory_xact_lock(hashtextextended(p_token_hash,0));
 select * into o from miroku_orders where token_hash=p_token_hash;
 if found then
   if o.created_at<now()-interval '30 minutes' or o.status<>'pending' then raise exception 'Checkout expired'; end if;
   return to_jsonb(o);
 end if;
 if jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Product unavailable'; end if;
 for i in select value from jsonb_array_elements(p_items) order by value->>'id' loop
   q=(i->>'quantity')::integer;
   select * into p from miroku_products where id=(i->>'id')::uuid for update;
   if not found or not p.published or q not between 1 and 99 then raise exception 'Product unavailable'; end if;
   if p.delivery_fee is null then raise exception 'Delivery not configured'; end if;
   select coalesce(sum((x->>'quantity')::integer),0) into held
     from miroku_orders r cross join lateral jsonb_array_elements(r.items) x
     where r.status='pending' and r.created_at>now()-interval '30 minutes' and x->>'id'=p.id::text;
   if p.stock-held<q then raise exception 'Not enough stock'; end if;
   total=total+round(p.price*100)::bigint*q+round(p.delivery_fee*100)::bigint;
   snapshot=snapshot||jsonb_build_array(jsonb_build_object('id',p.id,'name',p.name,'quantity',q,'price',p.price,'delivery_fee',p.delivery_fee));
 end loop;
 insert into miroku_orders(token_hash,customer,items,amount,mode) values(p_token_hash,p_customer,snapshot,total,p_mode) returning * into o;
 return to_jsonb(o);
end $$;

create or replace function public.miroku_attach_payment_order(p_order_id uuid,p_remote_id text)
returns text language plpgsql security definer set search_path=public as $$
declare o miroku_orders;
begin
 select * into strict o from miroku_orders where id=p_order_id for update;
 if o.razorpay_order_id is null then update miroku_orders set razorpay_order_id=p_remote_id where id=p_order_id; return p_remote_id; end if;
 return o.razorpay_order_id;
end $$;

create or replace function public.miroku_complete_order(p_order_id uuid,p_payment_id text,p_amount bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o miroku_orders; i jsonb; p miroku_products; available boolean=true;
begin
 select * into strict o from miroku_orders where id=p_order_id for update;
 if o.amount<>p_amount then raise exception 'Payment amount mismatch'; end if;
 if o.status<>'pending' then
   if o.razorpay_payment_id<>p_payment_id then raise exception 'Payment mismatch'; end if;
   return to_jsonb(o);
 end if;
 -- Both browser verification and webhook use this transaction: stock changes once.
 for i in select value from jsonb_array_elements(o.items) order by value->>'id' loop
   select * into p from miroku_products where id=(i->>'id')::uuid for update;
   if not found or p.stock<(i->>'quantity')::integer then available=false; end if;
 end loop;
 if available then
   for i in select value from jsonb_array_elements(o.items) loop
     update miroku_products set stock=stock-(i->>'quantity')::integer where id=(i->>'id')::uuid;
   end loop;
 end if;
 -- An unusually late captured payment may need a refund/fulfilment review.
 update miroku_orders set status=case when available then 'paid' else 'paid_review' end,
   razorpay_payment_id=p_payment_id,paid_at=now() where id=p_order_id returning * into o;
 return to_jsonb(o);
end $$;
revoke all on function public.miroku_create_order(jsonb,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.miroku_attach_payment_order(uuid,text) from public,anon,authenticated;
revoke all on function public.miroku_complete_order(uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.miroku_create_order(jsonb,jsonb,text,text) to service_role;
grant execute on function public.miroku_attach_payment_order(uuid,text) to service_role;
grant execute on function public.miroku_complete_order(uuid,text,bigint) to service_role;
notify pgrst,'reload schema';
commit;
