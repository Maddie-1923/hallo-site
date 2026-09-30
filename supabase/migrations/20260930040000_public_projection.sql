-- The public projection (docs/social-plan.md, step 1.2): the shareable part
-- of each member's library, copied out of their private row whenever it or
-- their profile changes, whether the phone or the site made the change.
--
-- - public_libraries: one cleaned copy of the library per member, built from
--   an allow-list (so notes, moods, tags, pictures, stamps and anything the
--   app adds later stay private unless added here on purpose). Profiles are
--   drawn from it with the same code as the owner's own view.
-- - public_entries: one row per title (or episode) they rated, reacted to or
--   reviewed, for members' reviews on title pages and the feed.
-- - public_lists: their own lists, for the lists hub.
--
-- Nothing is copied for an account without a username, a private account or
-- a suspended one, and making an account private deletes its copies. Titles
-- On Hold or Stopped Watching (series Stopped/Dropped, films On Hold/Dropped)
-- are never copied, nor any rating, reaction, review or watch of them.
-- The refresh never fails the library write: an error is logged as a
-- warning and the phone's sync goes through.

create table if not exists public.public_libraries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  archive jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.public_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- "movie:ID", "show:ID" or "episode:SHOWID-S-E", as the archive keys them.
  key text not null,
  kind text not null check (kind in ('movie', 'show', 'episode')),
  -- The film's or series' TMDB id (an episode's series).
  tmdb_id integer not null,
  -- "S-E" for an episode.
  episode text,
  title text not null,
  poster_path text,
  backdrop_path text,
  year text,
  rating numeric(3, 1),
  reaction text,
  review text,
  spoilers boolean not null default false,
  watched_on date,
  rewatch boolean not null default false,
  -- When this entry last changed, for the feed; kept as it is when a sync
  -- brings nothing new for it.
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
create index if not exists public_entries_title on public.public_entries (kind, tmdb_id);
create index if not exists public_entries_recent on public.public_entries (updated_at desc);

create table if not exists public.public_lists (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  detail text,
  show_ids integer[] not null default '{}',
  movie_ids integer[] not null default '{}',
  -- The list's titles in order (series, then films), with what a card needs:
  -- [{kind, id, title, poster_path, backdrop_path, year}].
  titles jsonb not null default '[]',
  created timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists public_lists_recent on public.public_lists (updated_at desc);

-- Whether the person asking may see this member's public rows: the member
-- has a username, is public and not suspended, and neither has blocked the
-- other.
create or replace function private.can_see(owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = owner and p.username is not null and not p.is_private and p.suspended_at is null
  ) and not private.is_blocked(auth.uid(), owner);
$$;
revoke all on function private.can_see(uuid) from public;
grant execute on function private.can_see(uuid) to anon, authenticated;

alter table public.public_libraries enable row level security;
alter table public.public_entries enable row level security;
alter table public.public_lists enable row level security;
-- Read-only to everyone; only the refresh below writes them.
revoke insert, update, delete on public.public_libraries, public.public_entries, public.public_lists from anon, authenticated;
drop policy if exists "public libraries: read" on public.public_libraries;
drop policy if exists "public entries: read" on public.public_entries;
drop policy if exists "public lists: read" on public.public_lists;
create policy "public libraries: read" on public.public_libraries for select to anon, authenticated using (private.can_see(user_id));
create policy "public entries: read" on public.public_entries for select to anon, authenticated using (private.can_see(user_id));
create policy "public lists: read" on public.public_lists for select to anon, authenticated using (private.can_see(user_id));

-- Only the named fields of an object.
create or replace function private.pick(o jsonb, keys text[]) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, o -> k), '{}'::jsonb) from unnest(keys) k where o ? k;
$$;

-- Rebuilds one member's public rows from their library and profile.
create or replace function private.refresh_projection(uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a jsonb;
  prof record;
  pub jsonb;
  shows_kept jsonb;
  movies_kept jsonb;
  kept_show_ids int[];
  kept_movie_ids int[];
begin
  select username, is_private, suspended_at into prof from public.profiles where user_id = uid;
  select archive into a from public.libraries where user_id = uid;

  if a is null or prof.username is null or prof.is_private or prof.suspended_at is not null then
    delete from public.public_entries where user_id = uid;
    delete from public.public_lists where user_id = uid;
    delete from public.public_libraries where user_id = uid;
    return;
  end if;

  -- The titles that can be shown, with only the fields the pages use.
  select coalesce(jsonb_agg(jsonb_build_object(
           'show', private.pick(s -> 'show', array['id', 'name', 'poster_path', 'backdrop_path', 'first_air_date', 'vote_average', 'status', 'genre_ids']),
           'status', s -> 'status', 'added', s -> 'added')), '[]'::jsonb),
         coalesce(array_agg((s -> 'show' ->> 'id')::int), '{}')
    into shows_kept, kept_show_ids
    from jsonb_array_elements(coalesce(a -> 'shows', '[]'::jsonb)) s
   where s -> 'show' ->> 'id' ~ '^\d+$' and coalesce(s ->> 'status', '') not in ('Stopped', 'Dropped');

  select coalesce(jsonb_agg(jsonb_build_object(
           'movie', private.pick(m -> 'movie', array['id', 'title', 'poster_path', 'backdrop_path', 'release_date', 'vote_average', 'runtime', 'genre_ids']),
           'status', m -> 'status', 'added', m -> 'added')), '[]'::jsonb),
         coalesce(array_agg((m -> 'movie' ->> 'id')::int), '{}')
    into movies_kept, kept_movie_ids
    from jsonb_array_elements(coalesce(a -> 'movies', '[]'::jsonb)) m
   where m -> 'movie' ->> 'id' ~ '^\d+$' and coalesce(m ->> 'status', '') not in ('On Hold', 'Dropped');

  pub := jsonb_build_object(
    'version', coalesce(a -> 'version', '12'::jsonb),
    'exported', '',
    'device', '',
    'shows', shows_kept,
    'movies', movies_kept,
    'watchedMovies', coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(a -> 'watchedMovies', '[]'::jsonb)) v where v::text ~ '^\d+$' and v::text::int = any(kept_movie_ids)), '[]'::jsonb),
    'movieWatchedDates', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'movieWatchedDates', '{}'::jsonb)) e(k, v) where k ~ '^\d+$' and k::int = any(kept_movie_ids)), '{}'::jsonb),
    'watched', coalesce((select jsonb_agg(v) from jsonb_array_elements_text(coalesce(a -> 'watched', '[]'::jsonb)) v where v ~ '^\d+-\d+-\d+$' and split_part(v, '-', 1)::int = any(kept_show_ids)), '[]'::jsonb),
    'watchedDates', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'watchedDates', '{}'::jsonb)) e(k, v) where k ~ '^\d+-\d+-\d+$' and split_part(k, '-', 1)::int = any(kept_show_ids)), '{}'::jsonb),
    'reactions', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'reactions', '{}'::jsonb)) e(k, v) where private.key_kept(k, kept_show_ids, kept_movie_ids)), '{}'::jsonb),
    'ratings', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'ratings', '{}'::jsonb)) e(k, v) where private.key_kept(k, kept_show_ids, kept_movie_ids) and jsonb_typeof(v) = 'number'), '{}'::jsonb),
    'reviews', coalesce((select jsonb_object_agg(k, private.pick(v, array['text', 'watchedOn', 'rewatch', 'spoilers', 'modified'])) from jsonb_each(coalesce(a -> 'reviews', '{}'::jsonb)) e(k, v) where private.key_kept(k, kept_show_ids, kept_movie_ids) and jsonb_typeof(v) = 'object'), '{}'::jsonb),
    -- A list keeps only the titles that are themselves shown, so it can't
    -- give away something On Hold or Stopped Watching.
    'customLists', coalesce((select jsonb_agg(private.pick(l, array['id', 'name', 'detail', 'created']) || jsonb_build_object(
        'showIDs', coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(l -> 'showIDs', '[]'::jsonb)) v where v::text ~ '^\d+$' and v::text::int = any(kept_show_ids)), '[]'::jsonb),
        'movieIDs', coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(l -> 'movieIDs', '[]'::jsonb)) v where v::text ~ '^\d+$' and v::text::int = any(kept_movie_ids)), '[]'::jsonb)))
      from jsonb_array_elements(coalesce(a -> 'customLists', '[]'::jsonb)) l where jsonb_typeof(l) = 'object' and l ? 'id' and l ? 'name'), '[]'::jsonb),
    'customListOrder', coalesce(a -> 'customListOrder', '[]'::jsonb)
  );

  insert into public.public_libraries (user_id, archive) values (uid, pub)
  on conflict (user_id) do update set archive = excluded.archive, updated_at = now()
  where public.public_libraries.archive is distinct from excluded.archive;

  -- Entries: every kept title or episode with a rating, reaction or review.
  with keys as (
    select k from jsonb_object_keys(pub -> 'ratings') k
    union select k from jsonb_object_keys(pub -> 'reactions') k
    union select k from jsonb_object_keys(pub -> 'reviews') k
  ),
  titles as (
    select 'show' as kind, (s -> 'show' ->> 'id')::int as id, s -> 'show' ->> 'name' as title, s -> 'show' ->> 'poster_path' as poster, s -> 'show' ->> 'backdrop_path' as backdrop, left(s -> 'show' ->> 'first_air_date', 4) as year
      from jsonb_array_elements(pub -> 'shows') s
    union all
    select 'movie', (m -> 'movie' ->> 'id')::int, m -> 'movie' ->> 'title', m -> 'movie' ->> 'poster_path', m -> 'movie' ->> 'backdrop_path', left(m -> 'movie' ->> 'release_date', 4)
      from jsonb_array_elements(pub -> 'movies') m
  ),
  fresh as (
    select keys.k as key,
           split_part(keys.k, ':', 1) as kind,
           t.id as tmdb_id,
           case when keys.k like 'episode:%' then substr(split_part(keys.k, ':', 2), length(split_part(split_part(keys.k, ':', 2), '-', 1)) + 2) end as episode,
           coalesce(t.title, '') as title, t.poster, t.backdrop, t.year,
           (pub -> 'ratings' ->> keys.k)::numeric(3, 1) as rating,
           pub -> 'reactions' ->> keys.k as reaction,
           nullif(btrim(pub -> 'reviews' -> keys.k ->> 'text'), '') as review,
           coalesce((pub -> 'reviews' -> keys.k ->> 'spoilers')::boolean, false) as spoilers,
           coalesce(
             case when (pub -> 'reviews' -> keys.k ->> 'watchedOn') ~ '^\d{4}-\d{2}-\d{2}' then left(pub -> 'reviews' -> keys.k ->> 'watchedOn', 10)::date end,
             case when keys.k like 'movie:%' and (pub -> 'movieWatchedDates' ->> split_part(keys.k, ':', 2)) ~ '^\d{4}-\d{2}-\d{2}' then left(pub -> 'movieWatchedDates' ->> split_part(keys.k, ':', 2), 10)::date end,
             case when keys.k like 'episode:%' and (pub -> 'watchedDates' ->> split_part(keys.k, ':', 2)) ~ '^\d{4}-\d{2}-\d{2}' then left(pub -> 'watchedDates' ->> split_part(keys.k, ':', 2), 10)::date end
           ) as watched_on,
           coalesce((pub -> 'reviews' -> keys.k ->> 'rewatch')::boolean, false) as rewatch
      from keys
      join titles t on t.kind = case when keys.k like 'episode:%' then 'show' else split_part(keys.k, ':', 1) end
                   and t.id = case when keys.k like 'episode:%' then split_part(split_part(keys.k, ':', 2), '-', 1)::int else split_part(keys.k, ':', 2)::int end
  ),
  gone as (
    delete from public.public_entries e where e.user_id = uid and not exists (select 1 from fresh f where f.key = e.key)
  )
  insert into public.public_entries (user_id, key, kind, tmdb_id, episode, title, poster_path, backdrop_path, year, rating, reaction, review, spoilers, watched_on, rewatch)
  select uid, key, kind, tmdb_id, episode, title, poster, backdrop, year, rating, reaction, review, spoilers, watched_on, rewatch from fresh
  on conflict (user_id, key) do update set
    kind = excluded.kind, tmdb_id = excluded.tmdb_id, episode = excluded.episode, title = excluded.title,
    poster_path = excluded.poster_path, backdrop_path = excluded.backdrop_path, year = excluded.year,
    rating = excluded.rating, reaction = excluded.reaction, review = excluded.review, spoilers = excluded.spoilers,
    watched_on = excluded.watched_on, rewatch = excluded.rewatch, updated_at = now()
  where (public.public_entries.rating, public.public_entries.reaction, public.public_entries.review, public.public_entries.spoilers, public.public_entries.watched_on, public.public_entries.rewatch, public.public_entries.title, public.public_entries.poster_path)
        is distinct from (excluded.rating, excluded.reaction, excluded.review, excluded.spoilers, excluded.watched_on, excluded.rewatch, excluded.title, excluded.poster_path);

  -- Lists.
  with fresh as (
    select l ->> 'id' as id, l ->> 'name' as name, l ->> 'detail' as detail,
           coalesce(array(select v::int from jsonb_array_elements_text(coalesce(l -> 'showIDs', '[]'::jsonb)) v where v ~ '^\d+$'), '{}') as show_ids,
           coalesce(array(select v::int from jsonb_array_elements_text(coalesce(l -> 'movieIDs', '[]'::jsonb)) v where v ~ '^\d+$'), '{}') as movie_ids,
           case when (l ->> 'created') ~ '^\d{4}-\d{2}-\d{2}' then (l ->> 'created')::timestamptz end as created,
           coalesce((select jsonb_agg(x.o order by x.g, x.n) from (
             select 1 as g, i.n, jsonb_build_object('kind', 'show', 'id', (s -> 'show' ->> 'id')::int, 'title', s -> 'show' ->> 'name', 'poster_path', s -> 'show' ->> 'poster_path', 'backdrop_path', s -> 'show' ->> 'backdrop_path', 'year', left(s -> 'show' ->> 'first_air_date', 4)) as o
               from jsonb_array_elements_text(coalesce(l -> 'showIDs', '[]'::jsonb)) with ordinality i(v, n)
               join jsonb_array_elements(pub -> 'shows') s on s -> 'show' ->> 'id' = i.v
             union all
             select 2, i.n, jsonb_build_object('kind', 'movie', 'id', (m -> 'movie' ->> 'id')::int, 'title', m -> 'movie' ->> 'title', 'poster_path', m -> 'movie' ->> 'poster_path', 'backdrop_path', m -> 'movie' ->> 'backdrop_path', 'year', left(m -> 'movie' ->> 'release_date', 4))
               from jsonb_array_elements_text(coalesce(l -> 'movieIDs', '[]'::jsonb)) with ordinality i(v, n)
               join jsonb_array_elements(pub -> 'movies') m on m -> 'movie' ->> 'id' = i.v
           ) x), '[]'::jsonb) as titles
      from jsonb_array_elements(pub -> 'customLists') l
  ),
  gone as (
    delete from public.public_lists p where p.user_id = uid and not exists (select 1 from fresh f where f.id = p.id)
  )
  insert into public.public_lists (user_id, id, name, detail, show_ids, movie_ids, titles, created)
  select uid, id, name, detail, show_ids, movie_ids, titles, created from fresh
  on conflict (user_id, id) do update set name = excluded.name, detail = excluded.detail, show_ids = excluded.show_ids, movie_ids = excluded.movie_ids, titles = excluded.titles, created = excluded.created, updated_at = now()
  where (public.public_lists.name, public.public_lists.detail, public.public_lists.show_ids, public.public_lists.movie_ids, public.public_lists.titles) is distinct from (excluded.name, excluded.detail, excluded.show_ids, excluded.movie_ids, excluded.titles);
end;
$$;
revoke all on function private.refresh_projection(uuid) from public, anon, authenticated;

-- Whether an archive key ("show:1", "movie:2", "episode:1-2-3") belongs to a
-- title that can be shown. Anything else is left out.
create or replace function private.key_kept(k text, show_ids int[], movie_ids int[]) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when k ~ '^show:\d+$' then split_part(k, ':', 2)::int = any(show_ids)
    when k ~ '^movie:\d+$' then split_part(k, ':', 2)::int = any(movie_ids)
    when k ~ '^episode:\d+-\d+-\d+$' then split_part(split_part(k, ':', 2), '-', 1)::int = any(show_ids)
    else false
  end;
$$;

-- The triggers. Each catches its own failure so the write that fired it
-- (the phone's sync above all) always goes through.
create or replace function private.on_library_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if tg_op = 'DELETE' then
      delete from public.public_entries where user_id = old.user_id;
      delete from public.public_lists where user_id = old.user_id;
      delete from public.public_libraries where user_id = old.user_id;
    else
      perform private.refresh_projection(new.user_id);
    end if;
  exception when others then
    raise warning 'public projection failed for %: % (%)', coalesce(new.user_id, old.user_id), sqlerrm, sqlstate;
  end;
  return null;
end;
$$;

create or replace function private.on_profile_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform private.refresh_projection(new.user_id);
  exception when others then
    raise warning 'public projection failed for %: % (%)', new.user_id, sqlerrm, sqlstate;
  end;
  return null;
end;
$$;

drop trigger if exists libraries_project on public.libraries;
create trigger libraries_project
  after insert or update of archive or delete on public.libraries
  for each row execute function private.on_library_change();

drop trigger if exists profiles_project on public.profiles;
create trigger profiles_project
  after insert or update of username, is_private, suspended_at on public.profiles
  for each row execute function private.on_profile_change();

-- The one-off backfill: everyone who already has a username.
select private.refresh_projection(user_id) from public.profiles where username is not null;
