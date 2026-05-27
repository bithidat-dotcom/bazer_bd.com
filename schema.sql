-- SQL Script for Bazer_bd.com
-- Run this in your Supabase SQL Editor at https://supabase.com/dashboard/project/jtpdctskvcaxbnmffrst/sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-----------------------
-- PRODUCTS TABLE
-----------------------
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price numeric not null,
  description text,
  image text,
  images jsonb default '[]'::jsonb,
  discount numeric default 0,
  created_at timestamp with time zone default now()
);

-----------------------
-- ORDERS TABLE
-----------------------
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  price numeric not null,
  customer_name text not null,
  whatsapp text not null,
  location text not null,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-----------------------
-- BANNERS TABLE
-----------------------
create table if not exists banners (
  id uuid primary key default uuid_generate_v4(),
  image text not null,
  created_at timestamp with time zone default now()
);

-----------------------------------
-- ROW LEVEL SECURITY (RLS)
-----------------------------------

-- Enable RLS
alter table products enable row level security;
alter table orders enable row level security;
alter table banners enable row level security;

-- Public can READ products
create policy "Public read products"
on products for select
using (true);

-- Public can READ banners
create policy "Public read banners"
on banners for select
using (true);

-- Public can INSERT orders
create policy "Public insert orders"
on orders for insert
with check (true);

-- Note: No update/delete policies for anonymous users, 
-- ensuring the frontend remains read-only for products/banners.

-----------------------------------
-- SAMPLE DATA (OPTIONAL)
-----------------------------------

-- insert into banners (image) values ('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=2000');
-- insert into products (name, price, description, image, discount) 
-- values ('Premium Wireless Headphones', 1200, 'High-quality sound with noise cancellation.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000', 10);
