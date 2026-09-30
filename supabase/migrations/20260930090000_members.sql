-- The Members page (docs/social-plan.md, step 4.5), 30 Sep 2026.

-- When each member joined, for New members; existing accounts take the date
-- they signed up.
alter table public.profiles add column if not exists created_at timestamptz not null default now();
update public.profiles p set created_at = u.created_at from auth.users u where u.id = p.user_id and p.created_at > u.created_at;

-- The directory: public members with what the page ranks them by. It runs
-- as the person asking (security invoker), so every count goes through the
-- same rules as the rest of the site: suspended members and anyone blocked
-- either way don't appear, and counts only include what the reader may see.
-- Private members are left out here (search finds them by name).
create or replace function public.member_directory(max_rows integer default 500)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  location text,
  quote text,
  joined timestamptz,
  followers bigint,
  following bigint,
  reviews bigint,
  titles integer,
  likes_this_week bigint,
  my_follow text
)
language sql stable security invoker set search_path = '' as $$
  select p.user_id, p.username, p.display_name, p.avatar_path, p.location, p.quote, p.created_at,
    (select count(*) from public.follows f where f.followee = p.user_id and f.status = 'accepted'),
    (select count(*) from public.follows f where f.follower = p.user_id and f.status = 'accepted'),
    (select count(*) from public.public_entries e where e.user_id = p.user_id and e.review is not null),
    coalesce((select jsonb_array_length(l.archive -> 'shows') + jsonb_array_length(l.archive -> 'movies') from public.public_libraries l where l.user_id = p.user_id), 0),
    (select count(*) from public.likes k where k.owner = p.user_id and k.created_at > now() - interval '7 days'),
    (select f.status from public.follows f where f.follower = auth.uid() and f.followee = p.user_id)
  from public.profiles p
  where p.username is not null and not p.is_private and p.suspended_at is null
  order by 8 desc, p.created_at desc
  limit least(greatest(max_rows, 1), 1000);
$$;
revoke all on function public.member_directory(integer) from public;
grant execute on function public.member_directory(integer) to anon, authenticated;

create index if not exists profiles_created on public.profiles (created_at desc) where username is not null;
