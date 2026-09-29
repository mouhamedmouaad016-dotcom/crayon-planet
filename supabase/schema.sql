-- CRAYON PLANET — Supabase schema
-- Run this once in Supabase Studio → SQL Editor → New query → Run.

-- 1) ADMIN ROLE -------------------------------------------------------
-- We mark specific auth.users as admins in a small table (safer than
-- trusting a JWT claim you set yourself). Add your own account's
-- UUID here after you create it in Supabase Auth (see README).
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz default now()
);

-- helper: is the currently authenticated request an admin?
create or replace function public.is_admin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admins where user_id = auth.uid());
$$;

-- 2) CATEGORIES ---------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sort int default 0,
  created_at timestamptz default now()
);

-- 3) PRODUCTS -------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text default '',
  price numeric(10,2) not null default 0,   -- DZD
  compare_at_price numeric(10,2),
  category_id uuid references public.categories(id) on delete set null,
  age_range text,
  pages int,
  file_type text,
  images text[] default '{}',               -- public URLs (product-images bucket)
  file_path text,                           -- path inside private bucket product-files
  file_name text,
  published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists products_published_idx on public.products(published);
create index if not exists products_category_idx on public.products(category_id);

-- 4) CUSTOMERS --------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  created_at timestamptz default now()
);

-- 5) ORDERS -------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null,
  customer_name text,
  items jsonb not null,          -- [{product_id, name, price}]
  total numeric(10,2) not null default 0,
  status text not null default 'Pending'
    check (status in ('Pending','Paid','Failed','Cancelled','Delivered')),
  payment_ref text,              -- set by the payment gateway webhook, stage 3
  download_token uuid,           -- generated only after status becomes Paid
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6) REVIEWS --------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  name text not null,
  rating int check (rating between 1 and 5),
  text text,
  approved boolean default false,
  created_at timestamptz default now()
);

-- 7) NEWSLETTER SUBSCRIBERS ------------------------------------------
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

-- 8) COUPONS (ready for stage 2/3 use) --------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  percent_off int,
  amount_off numeric(10,2),
  active boolean default true,
  expires_at timestamptz
);

-- 9) SITE SETTINGS (single row) ---------------------------------------
create table if not exists public.settings (
  id int primary key default 1,
  store_name text default 'CRAYON PLANET',
  domain text default 'crayonplanetdz.com',
  support_email text default 'mouhamedmouaad016@gmail.com',
  whatsapp text default '',
  facebook text default 'https://www.facebook.com/share/1DsWyCkcn7/',
  instagram text default 'https://www.instagram.com/crayon_planet?stkn=OXM0cXluNWI2ZDRh',
  pinterest text default 'https://pin.it/2bwDU22rN',
  telegram text default 'https://t.me/crayonplanet',
  x text default '',
  linkedin text default '',
  check (id = 1)
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ======================================================================
-- ROW LEVEL SECURITY
-- ======================================================================
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;
alter table public.subscribers enable row level security;
alter table public.coupons enable row level security;
alter table public.settings enable row level security;
alter table public.admins enable row level security;

-- categories: public read, admin write
create policy "categories_public_read" on public.categories for select using (true);
create policy "categories_admin_write" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

-- products: public reads only published rows; admin reads/writes everything
create policy "products_public_read" on public.products for select
  using (published = true or public.is_admin());
create policy "products_admin_write" on public.products for insert with check (public.is_admin());
create policy "products_admin_update" on public.products for update
  using (public.is_admin()) with check (public.is_admin());
create policy "products_admin_delete" on public.products for delete using (public.is_admin());

-- customers: admin only
create policy "customers_admin_all" on public.customers for all
  using (public.is_admin()) with check (public.is_admin());

-- orders: anyone can create an order (checkout), only admin can read/update
create policy "orders_public_insert" on public.orders for insert with check (true);
create policy "orders_admin_read" on public.orders for select using (public.is_admin());
create policy "orders_admin_update" on public.orders for update
  using (public.is_admin()) with check (public.is_admin());

-- reviews: public can read approved reviews and submit new ones (unapproved); admin manages all
create policy "reviews_public_read" on public.reviews for select using (approved = true or public.is_admin());
create policy "reviews_public_insert" on public.reviews for insert with check (approved = false);
create policy "reviews_admin_update" on public.reviews for update
  using (public.is_admin()) with check (public.is_admin());
create policy "reviews_admin_delete" on public.reviews for delete using (public.is_admin());

-- subscribers: anyone can subscribe, only admin can read the list
create policy "subscribers_public_insert" on public.subscribers for insert with check (true);
create policy "subscribers_admin_read" on public.subscribers for select using (public.is_admin());
create policy "subscribers_admin_delete" on public.subscribers for delete using (public.is_admin());

-- coupons: admin only (checked server-side at checkout in stage 3)
create policy "coupons_admin_all" on public.coupons for all
  using (public.is_admin()) with check (public.is_admin());

-- settings: public read, admin write
create policy "settings_public_read" on public.settings for select using (true);
create policy "settings_admin_update" on public.settings for update
  using (public.is_admin()) with check (public.is_admin());

-- admins table: only admins can see who else is an admin
create policy "admins_admin_read" on public.admins for select using (public.is_admin());

-- ======================================================================
-- STORAGE BUCKETS (run after creating the buckets in Storage UI, see README)
--   product-images  → PUBLIC bucket
--   product-files   → PRIVATE bucket
-- ======================================================================
insert into storage.buckets (id, name, public)
  values ('product-images','product-images', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('product-files','product-files', false)
  on conflict (id) do nothing;

create policy "product_images_public_read" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "product_images_admin_write" on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_admin_delete" on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());

-- product-files: no public policy at all — only the service role
-- (used from the server-only download-link route in stage 3) or an
-- admin session can read/write these objects.
create policy "product_files_admin_all" on storage.objects for all
  using (bucket_id = 'product-files' and public.is_admin())
  with check (bucket_id = 'product-files' and public.is_admin());
