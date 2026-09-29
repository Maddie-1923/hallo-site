-- Kodigo Pro, per account, whichever store sold it. The Stripe webhook
-- (/api/stripe/webhook) writes web subscriptions here with the service key;
-- the App Store and Google Play will write theirs the same way. A person can
-- read their own row; nobody writes it from a browser.
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  source text not null check (source in ('stripe', 'app_store', 'google_play')),
  pro boolean not null default false,
  plan text check (plan in ('monthly', 'yearly')),
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

create policy "Read your own entitlement" on public.entitlements
  for select using (auth.uid() = user_id);
