-- CRAYON PLANET — Migration 003 (security hardening, additive/adjustive only)
-- Run this AFTER migration_002_stage3.sql. No table or data is dropped.

-- Orders are now created exclusively through the server route /api/orders,
-- which uses the Supabase service role (bypasses RLS entirely) and computes
-- the price of every item by re-reading it from the products table — never
-- trusting the amount the browser sends. The public INSERT policy below is
-- therefore no longer needed and is removed, closing a real price-tampering
-- gap that existed while orders could be inserted directly from the browser
-- with an arbitrary "total".
drop policy if exists "orders_public_insert" on public.orders;

-- Everything else about orders (admin-only select/update) stays exactly as
-- defined in schema.sql.
