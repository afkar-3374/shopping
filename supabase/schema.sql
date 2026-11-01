-- Electrosparkzz Shop: Supabase schema (NOT applied yet).
-- Apply in the Supabase SQL editor once the project exists. The front end uses js/store.js.
-- Row Level Security is on. Public visitors can read active products and create orders;
-- only signed-in admins can change products, settings and orders.

create table if not exists public.shop_settings (
  id int primary key default 1 check (id = 1),
  shop_name text not null default 'Electrosparkzz Shop',
  tagline text default '',
  currency text not null default '₹',
  phone text default '',
  whatsapp text default '',
  upi_id text default '',
  address text default '',
  delivery_fee numeric(10,2) not null default 0,
  free_delivery_above numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.shop_settings (id) values (1) on conflict do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'General',
  price numeric(10,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  emoji text default '🛒',
  image text default '',
  description text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  status text not null default 'new' check (status in ('new','confirmed','packed','delivered','cancelled')),
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  delivery numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment text not null check (payment in ('cod','upi')),
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.shop_settings enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Anyone can read settings and active products.
create policy "settings readable" on public.shop_settings for select using (true);
create policy "active products readable" on public.products for select using (active or auth.role() = 'authenticated');

-- Admins (signed-in users) manage everything.
create policy "admins manage settings" on public.shop_settings for all to authenticated using (true) with check (true);
create policy "admins manage products" on public.products for all to authenticated using (true) with check (true);
create policy "admins manage orders" on public.orders for all to authenticated using (true) with check (true);

-- Orders are created through a function so stock is checked and reduced on the server.
create or replace function public.place_order(p_customer jsonb, p_items jsonb, p_payment text, p_notes text)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  prod public.products;
  sub numeric(10,2) := 0;
  fee numeric(10,2);
  s public.shop_settings;
  o public.orders;
  seq int;
begin
  if jsonb_array_length(p_items) = 0 then raise exception 'Your cart is empty.'; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    select * into prod from public.products where id = (item->>'productId')::uuid and active for update;
    if not found then raise exception 'A product is no longer available.'; end if;
    if prod.stock < (item->>'qty')::int then raise exception 'Only % of % left.', prod.stock, prod.name; end if;
    sub := sub + prod.price * (item->>'qty')::int;
  end loop;
  select * into s from public.shop_settings where id = 1;
  fee := case when sub = 0 then 0
              when s.free_delivery_above > 0 and sub >= s.free_delivery_above then 0
              else s.delivery_fee end;
  for item in select * from jsonb_array_elements(p_items) loop
    update public.products set stock = stock - (item->>'qty')::int where id = (item->>'productId')::uuid;
  end loop;
  select count(*) + 1001 into seq from public.orders;
  insert into public.orders (number, customer_name, customer_phone, customer_address, items, subtotal, delivery, total, payment, notes)
  values ('ES' || lpad(seq::text, 4, '0'), p_customer->>'name', p_customer->>'phone', p_customer->>'address',
          p_items, sub, fee, sub + fee, p_payment, coalesce(p_notes, ''))
  returning * into o;
  return o;
end $$;

grant execute on function public.place_order(jsonb, jsonb, text, text) to anon, authenticated;
