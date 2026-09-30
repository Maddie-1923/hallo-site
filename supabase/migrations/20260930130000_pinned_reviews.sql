-- Pinned reviews (docs/social-plan.md), 30 Sep 2026: up to three of the
-- owner's reviews shown first on their profile, by review key ("m329865",
-- "s1396", "e1396-2-4"). The owner sets them (column grant below); everyone
-- who can see the profile sees them.
alter table public.profiles add column if not exists pinned_reviews text[] not null default '{}';
alter table public.profiles drop constraint if exists pinned_reviews_limit;
alter table public.profiles add constraint pinned_reviews_limit check (cardinality(pinned_reviews) <= 3 and array_to_string(pinned_reviews, ',') ~ '^([mse][0-9-]+(,[mse][0-9-]+)*)?$');
grant insert (pinned_reviews) on public.profiles to authenticated;
grant update (pinned_reviews) on public.profiles to authenticated;
