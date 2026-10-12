-- A private library and public lists, 12 Oct 2026 (docs/profile-privacy-plan.md).
--
-- The eight built-in shelves were public unless switched off; now each one
-- is private until the member shares it from its badge on the Profile tab.
-- Lists stay public unless locked (category_privacy["list:<id>"] = true).
-- Reviews, ratings and reactions stay public whatever is shared, and so does
-- everything on a public list: those carry only the title (refShows and
-- refMovies), never its status, progress or dates.
--
-- shared_shelves holds the keys of the shelves shared. A missing key is
-- private, so every member starts private without a row being rewritten.
-- On Hold and Stopped Watching can never be shared.
--
-- show_watchlist and show_watching are no longer read; the Shows and Movies
-- shelves took their place. They stay until old app builds and site deploys
-- are gone.

alter table public.profiles add column if not exists shared_shelves text[] not null default '{}';

create or replace function private.refresh_projection(uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a jsonb;
  prof record;
  pub jsonb;
  shows_kept jsonb;
  movies_kept jsonb;
  -- The titles behind the shelves they shared (Profile → each shelf's
  -- badge). Their status, progress and dates are what a visitor sees.
  kept_show_ids int[];
  kept_movie_ids int[];
  -- Every title that may appear anywhere: all but On Hold and Stopped
  -- Watching. Reviews, ratings and public lists draw on these whatever is
  -- shared, but carry only the title itself (ref_shows / ref_movies).
  listable_show_ids int[];
  listable_movie_ids int[];
  ref_shows jsonb;
  ref_movies jsonb;
  shared text[];
  -- Watch dates are copied only while the Watchlog or Recent activity is
  -- shown; with both off, visitors can't learn when anything was watched.
  dated boolean;
  -- Series with a regular episode watched (specials don't count), which is
  -- what splits Ready to start (watchlist) from Watching now, as the site
  -- draws them.
  started int[];
  -- Titles carrying something the member published — a rating, reaction or
  -- review. They're public whatever is shared: posting it was the choice.
  voiced_show_ids int[];
  voiced_movie_ids int[];
  loved_show_ids int[];
  loved_movie_ids int[];
  rewatched_show_ids int[];
  rewatched_movie_ids int[];
begin
  select username, is_private, suspended_at, show_watchlog, show_activity, category_privacy, shared_shelves into prof from public.profiles where user_id = uid;
  select archive into a from public.libraries where user_id = uid;

  -- A private account keeps its copy now: approved followers read it
  -- (private.can_see decides who). No username or a suspension still means
  -- none at all.
  if a is null or prof.username is null or prof.suspended_at is not null then
    delete from public.public_entries where user_id = uid;
    delete from public.public_lists where user_id = uid;
    delete from public.public_libraries where user_id = uid;
    return;
  end if;
  dated := coalesce(prof.show_watchlog, true) or coalesce(prof.show_activity, true);
  -- On Hold and Stopped Watching can't be shared (set_shelf_shared refuses
  -- them), but a stray key mustn't share them either.
  shared := array(select x from unnest(coalesce(prof.shared_shelves, '{}')) x where x in ('shows', 'movies', 'upToDate', 'finished', 'favorites', 'rewatched'));
  started := array(select distinct split_part(v, '-', 1)::int from jsonb_array_elements_text(coalesce(a -> 'watched', '[]'::jsonb)) v
                    where v ~ '^\d+-\d+-\d+$' and v !~ '-0-\d+$');
  with voiced as (
    select jsonb_object_keys(coalesce(a -> 'ratings', '{}'::jsonb)) k
    union select jsonb_object_keys(coalesce(a -> 'reactions', '{}'::jsonb))
    union select jsonb_object_keys(coalesce(a -> 'reviews', '{}'::jsonb))
  )
  select coalesce(array_agg(distinct split_part(split_part(k, ':', 2), '-', 1)::int) filter (where k ~ '^(show|episode):\d+'), '{}'),
         coalesce(array_agg(distinct split_part(k, ':', 2)::int) filter (where k ~ '^movie:\d+$'), '{}')
    into voiced_show_ids, voiced_movie_ids
    from voiced;

  select coalesce(array_agg(distinct split_part(split_part(k, ':', 2), '-', 1)::int) filter (where k ~ '^(show|episode):\d+'), '{}'),
         coalesce(array_agg(distinct split_part(k, ':', 2)::int) filter (where k ~ '^movie:\d+$'), '{}')
    into loved_show_ids, loved_movie_ids
    from jsonb_each_text(coalesce(a -> 'reactions', '{}'::jsonb)) e(k, v) where v = 'loved';
  rewatched_movie_ids := array(select distinct (t ->> 'movieID')::int from jsonb_array_elements(coalesce(a -> 'movieRewatchLog', '[]'::jsonb)) t where t ->> 'movieID' ~ '^\d+$');
  rewatched_show_ids := array(select distinct split_part(t ->> 'episodeID', '-', 1)::int from jsonb_array_elements(coalesce(a -> 'rewatchLog', '[]'::jsonb)) t where t ->> 'episodeID' ~ '^\d+-\d+-\d+$');

  listable_show_ids := array(select (s -> 'show' ->> 'id')::int from jsonb_array_elements(coalesce(a -> 'shows', '[]'::jsonb)) s
                              where s -> 'show' ->> 'id' ~ '^\d+$' and coalesce(s ->> 'status', '') not in ('Stopped', 'Dropped'));
  listable_movie_ids := array(select (m -> 'movie' ->> 'id')::int from jsonb_array_elements(coalesce(a -> 'movies', '[]'::jsonb)) m
                               where m -> 'movie' ->> 'id' ~ '^\d+$' and coalesce(m ->> 'status', '') not in ('On Hold', 'Dropped'));

  -- The titles that can be shown, with only the fields the pages use.
  select coalesce(jsonb_agg(jsonb_build_object(
           'show', private.pick(s -> 'show', array['id', 'name', 'poster_path', 'backdrop_path', 'first_air_date', 'vote_average', 'status', 'genre_ids']),
           'status', s -> 'status', 'added', s -> 'added')), '[]'::jsonb),
         coalesce(array_agg((s -> 'show' ->> 'id')::int), '{}')
    into shows_kept, kept_show_ids
    from jsonb_array_elements(coalesce(a -> 'shows', '[]'::jsonb)) s
   where s -> 'show' ->> 'id' ~ '^\d+$' and (s -> 'show' ->> 'id')::int = any(listable_show_ids)
     -- Each shared shelf brings its own titles. Up to Date needs TMDB to know
     -- what has aired, so it brings every series being watched with an
     -- episode seen, and the website draws the ones that are caught up.
     and ('shows' = any(shared)
          or ('finished' = any(shared) and s ->> 'status' = 'Finished')
          or ('upToDate' = any(shared) and s ->> 'status' = 'Watching' and (s -> 'show' ->> 'id')::int = any(started))
          or ('favorites' = any(shared) and (s -> 'show' ->> 'id')::int = any(loved_show_ids))
          or ('rewatched' = any(shared) and (s -> 'show' ->> 'id')::int = any(rewatched_show_ids)));

  select coalesce(jsonb_agg(jsonb_build_object(
           'movie', private.pick(m -> 'movie', array['id', 'title', 'poster_path', 'backdrop_path', 'release_date', 'vote_average', 'runtime', 'genre_ids']),
           'status', m -> 'status', 'added', m -> 'added')), '[]'::jsonb),
         coalesce(array_agg((m -> 'movie' ->> 'id')::int), '{}')
    into movies_kept, kept_movie_ids
    from jsonb_array_elements(coalesce(a -> 'movies', '[]'::jsonb)) m
   where m -> 'movie' ->> 'id' ~ '^\d+$' and (m -> 'movie' ->> 'id')::int = any(listable_movie_ids)
     and ('movies' = any(shared)
          or ('finished' = any(shared) and m ->> 'status' = 'Watched')
          or ('favorites' = any(shared) and (m -> 'movie' ->> 'id')::int = any(loved_movie_ids))
          or ('rewatched' = any(shared) and (m -> 'movie' ->> 'id')::int = any(rewatched_movie_ids)));

  -- The rest of what's public needs only the title: a reviewed or rated title
  -- and anything on a public list, when no shared shelf brought it already.
  select coalesce(jsonb_agg(jsonb_build_object('show', private.pick(s -> 'show', array['id', 'name', 'poster_path', 'backdrop_path', 'first_air_date', 'genre_ids']))), '[]'::jsonb)
    into ref_shows
    from jsonb_array_elements(coalesce(a -> 'shows', '[]'::jsonb)) s
   where s -> 'show' ->> 'id' ~ '^\d+$' and (s -> 'show' ->> 'id')::int = any(listable_show_ids)
     and not (s -> 'show' ->> 'id')::int = any(kept_show_ids)
     and ((s -> 'show' ->> 'id')::int = any(voiced_show_ids)
          or exists (select 1 from jsonb_array_elements(coalesce(a -> 'customLists', '[]'::jsonb)) l, jsonb_array_elements_text(coalesce(l -> 'showIDs', '[]'::jsonb)) v
                      where jsonb_typeof(l) = 'object' and not coalesce((prof.category_privacy ->> ('list:' || (l ->> 'id')))::boolean, false) and v = s -> 'show' ->> 'id'));
  select coalesce(jsonb_agg(jsonb_build_object('movie', private.pick(m -> 'movie', array['id', 'title', 'poster_path', 'backdrop_path', 'release_date', 'genre_ids']))), '[]'::jsonb)
    into ref_movies
    from jsonb_array_elements(coalesce(a -> 'movies', '[]'::jsonb)) m
   where m -> 'movie' ->> 'id' ~ '^\d+$' and (m -> 'movie' ->> 'id')::int = any(listable_movie_ids)
     and not (m -> 'movie' ->> 'id')::int = any(kept_movie_ids)
     and ((m -> 'movie' ->> 'id')::int = any(voiced_movie_ids)
          or exists (select 1 from jsonb_array_elements(coalesce(a -> 'customLists', '[]'::jsonb)) l, jsonb_array_elements_text(coalesce(l -> 'movieIDs', '[]'::jsonb)) v
                      where jsonb_typeof(l) = 'object' and not coalesce((prof.category_privacy ->> ('list:' || (l ->> 'id')))::boolean, false) and v = m -> 'movie' ->> 'id'));

  pub := jsonb_build_object(
    'version', coalesce(a -> 'version', '12'::jsonb),
    'exported', '',
    'device', '',
    'shows', shows_kept,
    'movies', movies_kept,
    'refShows', ref_shows,
    'refMovies', ref_movies,
    'sharedShelves', to_jsonb(shared),
    -- A count gives no titles away; the Members page shows it.
    'titleCount', coalesce(array_length(listable_show_ids, 1), 0) + coalesce(array_length(listable_movie_ids, 1), 0),
    'watchedMovies', coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(a -> 'watchedMovies', '[]'::jsonb)) v where v::text ~ '^\d+$' and v::text::int = any(kept_movie_ids)), '[]'::jsonb),
    'movieWatchedDates', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'movieWatchedDates', '{}'::jsonb)) e(k, v) where dated and k ~ '^\d+$' and k::int = any(kept_movie_ids)), '{}'::jsonb),
    'watched', coalesce((select jsonb_agg(v) from jsonb_array_elements_text(coalesce(a -> 'watched', '[]'::jsonb)) v where v ~ '^\d+-\d+-\d+$' and split_part(v, '-', 1)::int = any(kept_show_ids)), '[]'::jsonb),
    'watchedDates', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'watchedDates', '{}'::jsonb)) e(k, v) where dated and k ~ '^\d+-\d+-\d+$' and split_part(k, '-', 1)::int = any(kept_show_ids)), '{}'::jsonb),
    'reactions', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'reactions', '{}'::jsonb)) e(k, v) where private.key_kept(k, listable_show_ids, listable_movie_ids)), '{}'::jsonb),
    'ratings', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'ratings', '{}'::jsonb)) e(k, v) where private.key_kept(k, listable_show_ids, listable_movie_ids) and jsonb_typeof(v) = 'number'), '{}'::jsonb),
    'reviews', coalesce((select jsonb_object_agg(k, private.pick(v, case when dated then array['text', 'watchedOn', 'rewatch', 'spoilers', 'modified'] else array['text', 'rewatch', 'spoilers'] end)) from jsonb_each(coalesce(a -> 'reviews', '{}'::jsonb)) e(k, v) where private.key_kept(k, listable_show_ids, listable_movie_ids) and jsonb_typeof(v) = 'object'), '{}'::jsonb),
    -- A list keeps every title but On Hold and Stopped Watching, whether or
    -- not a shelf is shared: a public list was the choice.
    'customLists', coalesce((select jsonb_agg(private.pick(l, array['id', 'name', 'detail', 'created']) || jsonb_build_object(
        'showIDs', coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(l -> 'showIDs', '[]'::jsonb)) v where v::text ~ '^\d+$' and v::text::int = any(listable_show_ids)), '[]'::jsonb),
        'movieIDs', coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(l -> 'movieIDs', '[]'::jsonb)) v where v::text ~ '^\d+$' and v::text::int = any(listable_movie_ids)), '[]'::jsonb)))
      from jsonb_array_elements(coalesce(a -> 'customLists', '[]'::jsonb)) l
      where jsonb_typeof(l) = 'object' and l ? 'id' and l ? 'name'
        -- A list whose eye is off on the profile isn't copied at all.
        and not coalesce((prof.category_privacy ->> ('list:' || (l ->> 'id')))::boolean, false)), '[]'::jsonb),
    'customListOrder', coalesce(a -> 'customListOrder', '[]'::jsonb),
    -- Rewatched, when shared: each night's date only while dates are shown.
    'movieRewatchLog', coalesce((select jsonb_agg(case when dated then t else (t - 'watched') || '{"watched": ""}'::jsonb end) from jsonb_array_elements(coalesce(a -> 'movieRewatchLog', '[]'::jsonb)) t
                                  where 'rewatched' = any(shared) and t ->> 'movieID' ~ '^\d+$' and (t ->> 'movieID')::int = any(kept_movie_ids)), '[]'::jsonb),
    'rewatchLog', coalesce((select jsonb_agg(case when dated then t else (t - 'watched') || '{"watched": ""}'::jsonb end) from jsonb_array_elements(coalesce(a -> 'rewatchLog', '[]'::jsonb)) t
                             where 'rewatched' = any(shared) and t ->> 'episodeID' ~ '^\d+-\d+-\d+$' and split_part(t ->> 'episodeID', '-', 1)::int = any(kept_show_ids)), '[]'::jsonb)
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
    union all
    select 'show', (s -> 'show' ->> 'id')::int, s -> 'show' ->> 'name', s -> 'show' ->> 'poster_path', s -> 'show' ->> 'backdrop_path', left(s -> 'show' ->> 'first_air_date', 4)
      from jsonb_array_elements(pub -> 'refShows') s
    union all
    select 'movie', (m -> 'movie' ->> 'id')::int, m -> 'movie' ->> 'title', m -> 'movie' ->> 'poster_path', m -> 'movie' ->> 'backdrop_path', left(m -> 'movie' ->> 'release_date', 4)
      from jsonb_array_elements(pub -> 'refMovies') m
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
               join jsonb_array_elements((pub -> 'shows') || (pub -> 'refShows')) s on s -> 'show' ->> 'id' = i.v
             union all
             select 2, i.n, jsonb_build_object('kind', 'movie', 'id', (m -> 'movie' ->> 'id')::int, 'title', m -> 'movie' ->> 'title', 'poster_path', m -> 'movie' ->> 'poster_path', 'backdrop_path', m -> 'movie' ->> 'backdrop_path', 'year', left(m -> 'movie' ->> 'release_date', 4))
               from jsonb_array_elements_text(coalesce(l -> 'movieIDs', '[]'::jsonb)) with ordinality i(v, n)
               join jsonb_array_elements((pub -> 'movies') || (pub -> 'refMovies')) m on m -> 'movie' ->> 'id' = i.v
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


-- One key at a time, on the server, so two quick taps can't write over each
-- other the way reading the whole map and writing it back could.
create or replace function public.set_shelf_shared(shelf text, shared boolean) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  result text[];
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if shelf not in ('shows', 'movies', 'upToDate', 'finished', 'favorites', 'rewatched') then
    raise exception 'shelf % cannot be shared', shelf using errcode = '22023';
  end if;
  update public.profiles
     set shared_shelves = case when shared then array(select distinct x from unnest(array_append(shared_shelves, shelf)) x order by x)
                               else array_remove(shared_shelves, shelf) end
   where user_id = auth.uid()
  returning shared_shelves into result;
  return coalesce(result, '{}');
end;
$$;
revoke all on function public.set_shelf_shared(text, boolean) from public, anon;
grant execute on function public.set_shelf_shared(text, boolean) to authenticated;

create or replace function public.set_list_hidden(list_id text, hidden boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if list_id !~ '^[A-Za-z0-9-]{1,64}$' then
    raise exception 'bad list id' using errcode = '22023';
  end if;
  update public.profiles
     set category_privacy = case when hidden then coalesce(category_privacy, '{}'::jsonb) || jsonb_build_object('list:' || list_id, true)
                                 else coalesce(category_privacy, '{}'::jsonb) - ('list:' || list_id) end
   where user_id = auth.uid()
  returning category_privacy into result;
  return coalesce(result, '{}'::jsonb);
end;
$$;
revoke all on function public.set_list_hidden(text, boolean) from public, anon;
grant execute on function public.set_list_hidden(text, boolean) to authenticated;

drop trigger if exists profiles_project on public.profiles;
create trigger profiles_project
  after insert or update of username, is_private, suspended_at, show_activity, show_watchlog, category_privacy, shared_shelves on public.profiles
  for each row execute function private.on_profile_change();

-- A list's topic reads its titles' genres, which may now be in refShows or
-- refMovies rather than the shared shelves.
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
        (select s -> 'show' -> 'genre_ids' from jsonb_array_elements(coalesce(pl.archive -> 'shows', '[]') || coalesce(pl.archive -> 'refShows', '[]')) s where i.kind = 'show' and (s -> 'show' ->> 'id')::int = i.tid limit 1),
        (select m -> 'movie' -> 'genre_ids' from jsonb_array_elements(coalesce(pl.archive -> 'movies', '[]') || coalesce(pl.archive -> 'refMovies', '[]')) m where i.kind = 'movie' and (m -> 'movie' ->> 'id')::int = i.tid limit 1),
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

-- The Members page's titles count: the projection's titleCount, since the
-- shared shelves alone would read 0 for nearly everyone.
create or replace function private.refresh_member_stats() returns void
language sql security definer set search_path = '' as $$
  insert into public.member_stats (user_id, followers, following, reviews, titles, likes_this_week, refreshed_at)
  select p.user_id,
    (select count(*) from public.follows f where f.followee = p.user_id and f.status = 'accepted'),
    (select count(*) from public.follows f where f.follower = p.user_id and f.status = 'accepted'),
    (select count(*) from public.public_entries e where e.user_id = p.user_id and e.review is not null),
    coalesce((select coalesce((l.archive ->> 'titleCount')::int, jsonb_array_length(coalesce(l.archive -> 'shows', '[]')) + jsonb_array_length(coalesce(l.archive -> 'movies', '[]'))) from public.public_libraries l where l.user_id = p.user_id), 0),
    (select count(*) from public.likes k where k.owner = p.user_id and k.created_at > now() - interval '7 days'),
    now()
  from public.profiles p
  where p.username is not null
  on conflict (user_id) do update set
    followers = excluded.followers, following = excluded.following, reviews = excluded.reviews,
    titles = excluded.titles, likes_this_week = excluded.likes_this_week, refreshed_at = excluded.refreshed_at;
$$;
revoke all on function private.refresh_member_stats() from public, anon, authenticated;

select private.refresh_projection(user_id) from public.profiles where username is not null;
select private.refresh_member_stats();
