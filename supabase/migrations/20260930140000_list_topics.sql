-- Featured and by-topic lists (docs/social-plan.md), 30 Sep 2026.
--
-- Each list's main genre, for the Lists page's topic rows: the genre most of
-- its titles share, read from the owner's public library (which carries each
-- title's TMDB genre ids), when at least half its titles have it. Runs as
-- the reader, so only lists they may see.
create or replace function public.list_topics()
returns table (user_id uuid, id text, genre integer)
language sql stable security invoker set search_path = '' as $$
  with items as (
    select l.user_id, l.id, (t ->> 'kind') as kind, (t ->> 'id')::int as tid, jsonb_array_length(l.titles) as size
    from public.public_lists l, jsonb_array_elements(l.titles) t
    where jsonb_array_length(l.titles) >= 3
  ),
  genres as (
    select i.user_id, i.id, i.size, g::int as genre
    from items i
    join public.public_libraries pl on pl.user_id = i.user_id
    cross join lateral (
      select coalesce(
        (select s -> 'show' -> 'genre_ids' from jsonb_array_elements(pl.archive -> 'shows') s where i.kind = 'show' and (s -> 'show' ->> 'id')::int = i.tid limit 1),
        (select m -> 'movie' -> 'genre_ids' from jsonb_array_elements(pl.archive -> 'movies') m where i.kind = 'movie' and (m -> 'movie' ->> 'id')::int = i.tid limit 1),
        '[]'::jsonb) as ids
    ) x, jsonb_array_elements_text(x.ids) g
  ),
  counted as (
    select g.user_id, g.id, g.genre, count(*) as n, max(g.size) as size,
           row_number() over (partition by g.user_id, g.id order by count(*) desc, g.genre) as rank
    from genres g group by g.user_id, g.id, g.genre
  )
  select c.user_id, c.id, c.genre from counted c where c.rank = 1 and c.n * 2 >= c.size;
$$;
grant execute on function public.list_topics() to anon, authenticated;

-- Lists the moderators feature at the top of the Lists page. Anyone may see
-- a featured list they could see anyway; only the service role (a
-- moderator, through the site) writes.
create table if not exists public.featured_lists (
  owner uuid not null references auth.users (id) on delete cascade,
  list_id text not null,
  featured_at timestamptz not null default now(),
  primary key (owner, list_id)
);
alter table public.featured_lists enable row level security;
revoke insert, update, delete on public.featured_lists from anon, authenticated;
drop policy if exists "featured lists: read" on public.featured_lists;
create policy "featured lists: read" on public.featured_lists for select to anon, authenticated using (private.can_see(owner));
