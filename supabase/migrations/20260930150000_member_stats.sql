-- Speed for many members (docs/social-plan.md), 30 Sep 2026: each member's
-- numbers kept ready for the Members page instead of counted on every
-- visit (member_directory used to open every public library to count its
-- titles). Refreshed every ten minutes by pg_cron and once now; the reader's
-- own follow state is still read live.
create extension if not exists pg_cron;

create table if not exists public.member_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  followers integer not null default 0,
  following integer not null default 0,
  reviews integer not null default 0,
  titles integer not null default 0,
  likes_this_week integer not null default 0,
  refreshed_at timestamptz not null default now()
);
alter table public.member_stats enable row level security;
revoke insert, update, delete on public.member_stats from anon, authenticated;
drop policy if exists "member stats: read" on public.member_stats;
create policy "member stats: read" on public.member_stats for select to anon, authenticated using (private.can_see(user_id));

create or replace function private.refresh_member_stats() returns void
language sql security definer set search_path = '' as $$
  insert into public.member_stats (user_id, followers, following, reviews, titles, likes_this_week, refreshed_at)
  select p.user_id,
    (select count(*) from public.follows f where f.followee = p.user_id and f.status = 'accepted'),
    (select count(*) from public.follows f where f.follower = p.user_id and f.status = 'accepted'),
    (select count(*) from public.public_entries e where e.user_id = p.user_id and e.review is not null),
    coalesce((select jsonb_array_length(coalesce(l.archive -> 'shows', '[]')) + jsonb_array_length(coalesce(l.archive -> 'movies', '[]')) from public.public_libraries l where l.user_id = p.user_id), 0),
    (select count(*) from public.likes k where k.owner = p.user_id and k.created_at > now() - interval '7 days'),
    now()
  from public.profiles p
  where p.username is not null
  on conflict (user_id) do update set
    followers = excluded.followers, following = excluded.following, reviews = excluded.reviews,
    titles = excluded.titles, likes_this_week = excluded.likes_this_week, refreshed_at = excluded.refreshed_at;
$$;
revoke all on function private.refresh_member_stats() from public, anon, authenticated;
select private.refresh_member_stats();

select cron.unschedule('member-stats') where exists (select 1 from cron.job where jobname = 'member-stats');
select cron.schedule('member-stats', '*/10 * * * *', 'select private.refresh_member_stats()');

-- The directory reads the kept numbers (a member too new to be counted yet
-- shows zeros until the next refresh).
create or replace function public.member_directory(max_rows integer default 500)
returns table (
  user_id uuid, username text, display_name text, avatar_path text, location text, quote text, joined timestamptz,
  followers bigint, following bigint, reviews bigint, titles integer, likes_this_week bigint, my_follow text
)
language sql stable security invoker set search_path = '' as $$
  select p.user_id, p.username, p.display_name, p.avatar_path, p.location, p.quote, p.created_at,
    coalesce(s.followers, 0)::bigint, coalesce(s.following, 0)::bigint, coalesce(s.reviews, 0)::bigint,
    coalesce(s.titles, 0), coalesce(s.likes_this_week, 0)::bigint,
    (select f.status from public.follows f where f.follower = auth.uid() and f.followee = p.user_id)
  from public.profiles p
  left join public.member_stats s on s.user_id = p.user_id
  where p.username is not null and not p.is_private and p.suspended_at is null
  order by 8 desc, p.created_at desc
  limit least(greatest(max_rows, 1), 1000);
$$;
