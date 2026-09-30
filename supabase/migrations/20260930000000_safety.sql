-- Safety: blocks, reports and suspensions (docs/social-plan.md, step 6).
-- Applied to kodigo-dev 30 Sep 2026. The public tables' read policies
-- (step 1) use is_blocked() so a block hides both people from each other;
-- it moved to private.is_blocked in 20260930010000_safety_private.sql.

-- A block: blocker no longer sees blocked, and blocked no longer sees
-- blocker. Blocking also removes any follow between them (the follows
-- table's own trigger, step 4, calls end_follows_on_block).
create table if not exists public.blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;
create policy "blocks: read your own"   on public.blocks for select using ((select auth.uid()) = blocker);
create policy "blocks: add your own"    on public.blocks for insert with check ((select auth.uid()) = blocker);
create policy "blocks: remove your own" on public.blocks for delete using ((select auth.uid()) = blocker);

-- Whether either of two people has blocked the other. For the public
-- tables' read policies: `using (not private.is_blocked(auth.uid(), user_id))`
-- (moved to `private` by the next migration).
create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

-- A report of a review, comment, list or profile. Reporters can file one
-- and read their own; only the moderation page (service role) reads them
-- all. The excerpt keeps what was reported even if it's edited later.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('review', 'comment', 'list', 'profile')),
  target text not null,
  author uuid references auth.users (id) on delete cascade,
  author_username text not null,
  href text not null,
  excerpt text not null default '' check (char_length(excerpt) <= 600),
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'sexual', 'private', 'impersonation', 'spoilers', 'copyright', 'other')),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'dismissed', 'removed', 'suspended')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);
create index if not exists reports_open on public.reports (created_at desc) where status = 'open';
-- One report per person per thing.
create unique index if not exists reports_once on public.reports (reporter, kind, target);
alter table public.reports enable row level security;
create policy "reports: file"          on public.reports for insert with check ((select auth.uid()) = reporter and status = 'open');
create policy "reports: read your own" on public.reports for select using ((select auth.uid()) = reporter);

-- A suspended account keeps its data but its public pages and posts are
-- hidden, and it can't post, until the suspension is lifted.
alter table public.profiles add column if not exists suspended_at timestamptz;
