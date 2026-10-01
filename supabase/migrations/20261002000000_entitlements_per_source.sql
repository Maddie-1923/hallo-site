-- Kodigo Pro from more than one place: a row per account per store, so a
-- subscription on the website and one in the app sit side by side rather
-- than one writing over the other. Pro is any row that's on (lib/pro.ts).
-- The store rows come from RevenueCat (/api/revenuecat/webhook), which hears
-- from Apple and Google; the Stripe row from /api/stripe/webhook as before.
alter table public.entitlements drop constraint if exists entitlements_pkey;
alter table public.entitlements add primary key (user_id, source);
alter table public.entitlements add column if not exists store_product_id text;
