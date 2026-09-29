-- CRAYON PLANET — Migration 002 (Stage 3: payment readiness + admin completeness)
-- Additive only: no table is dropped, no existing column is removed or renamed.
-- Safe to run on the existing Supabase project as-is.

-- 1) Featured flag for products (admin toggle "تحديد المنتج المميز")
alter table public.products add column if not exists featured boolean default false;
create index if not exists products_featured_idx on public.products(featured) where featured = true;

-- 2) Webhook dedupe — prevents processing the same Chargily event twice
create table if not exists public.webhook_events (
  id text primary key,              -- Chargily event id (or checkout id + type)
  provider text not null default 'chargily',
  event_type text,
  payload jsonb,
  processed_at timestamptz default now()
);
alter table public.webhook_events enable row level security;
-- No public policy at all: only the service role (used server-side in the
-- webhook route) can read/write this table. Regular users, including admins
-- signed in through the browser, have no access to it — this table is not
-- meant to be browsed from the app.

-- 3) Orders: make sure payment_ref is unique once set, to guard against
-- two different orders being reconciled against the same Chargily checkout.
create unique index if not exists orders_payment_ref_uidx
  on public.orders(payment_ref) where payment_ref is not null;

-- 4) Customers: a customer row is created/updated automatically whenever an
-- order is placed (see the checkout API route), so admin.customers stays a
-- real, non-fake CRM list.

-- 5) Reviews: policies already allow public insert (unapproved) and public
-- read of approved rows from schema.sql — unchanged here.

-- 6) Subscribers: policies already allow public insert from schema.sql —
-- unchanged here. Used by the footer newsletter form.
