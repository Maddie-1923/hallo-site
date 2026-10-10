-- Watchlist and Watching now kept out of the public copy when hidden, 11 Oct 2026.
--
-- Settings → Privacy → Show your watchlist and Show what you're watching only
-- hid the website's tabs. The titles stayed in public_libraries, which the
-- anon key reads directly, so turning a switch off hid nothing from anyone
-- who asked the API. Now the projection leaves them out: with Show your
-- watchlist off, films To Watch and series Watching with no regular episode
-- seen; with Show what you're watching off, series Watching that have one.
-- Their episode progress, dates and list entries go with them, since all of
-- those are filtered on the kept ids.
--
-- The profile trigger didn't fire on these two columns either, so flipping a
-- switch changed nothing until the next library sync. It does now, and every
-- copy is rebuilt once at the end.

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
  -- Watch dates are copied only while the Watchlog or Recent activity is
  -- shown; with both off, visitors can't learn when anything was watched.
  dated boolean;
  -- Profile → Privacy's two switches. Off, the titles they cover are left out
  -- of the copy altogether: hiding the tab on the website alone left them in
  -- public_libraries, which anyone holding the app's public key can read.
  show_wl boolean;
  show_wg boolean;
  -- Series with a regular episode watched (specials don't count), which is
  -- what splits Ready to start (watchlist) from Watching now, as the site
  -- draws them.
  started int[];
  -- Titles carrying something the member published — a rating, reaction or
  -- review. They stay whatever the switches say, so turning one off never
  -- takes down reviews somebody chose to post; the review already says they
  -- are watching it.
  voiced_show_ids int[];
  voiced_movie_ids int[];
begin
  select username, is_private, suspended_at, show_watchlog, show_activity, show_watchlist, show_watching, category_privacy into prof from public.profiles where user_id = uid;
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
  show_wl := coalesce(prof.show_watchlist, true);
  show_wg := coalesce(prof.show_watching, true);
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

  -- The titles that can be shown, with only the fields the pages use.
  select coalesce(jsonb_agg(jsonb_build_object(
           'show', private.pick(s -> 'show', array['id', 'name', 'poster_path', 'backdrop_path', 'first_air_date', 'vote_average', 'status', 'genre_ids']),
           'status', s -> 'status', 'added', s -> 'added')), '[]'::jsonb),
         coalesce(array_agg((s -> 'show' ->> 'id')::int), '{}')
    into shows_kept, kept_show_ids
    from jsonb_array_elements(coalesce(a -> 'shows', '[]'::jsonb)) s
   where s -> 'show' ->> 'id' ~ '^\d+$' and coalesce(s ->> 'status', '') not in ('Stopped', 'Dropped')
     and (coalesce(s ->> 'status', '') <> 'Watching'
          or (s -> 'show' ->> 'id')::int = any(voiced_show_ids)
          or case when (s -> 'show' ->> 'id')::int = any(started) then show_wg else show_wl end);

  select coalesce(jsonb_agg(jsonb_build_object(
           'movie', private.pick(m -> 'movie', array['id', 'title', 'poster_path', 'backdrop_path', 'release_date', 'vote_average', 'runtime', 'genre_ids']),
           'status', m -> 'status', 'added', m -> 'added')), '[]'::jsonb),
         coalesce(array_agg((m -> 'movie' ->> 'id')::int), '{}')
    into movies_kept, kept_movie_ids
    from jsonb_array_elements(coalesce(a -> 'movies', '[]'::jsonb)) m
   where m -> 'movie' ->> 'id' ~ '^\d+$' and coalesce(m ->> 'status', '') not in ('On Hold', 'Dropped')
     -- A film with no status reads as To Watch in the app, so it does here.
     and (coalesce(m ->> 'status', 'To Watch') <> 'To Watch' or show_wl or (m -> 'movie' ->> 'id')::int = any(voiced_movie_ids));

  pub := jsonb_build_object(
    'version', coalesce(a -> 'version', '12'::jsonb),
    'exported', '',
    'device', '',
    'shows', shows_kept,
    'movies', movies_kept,
    'watchedMovies', coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(a -> 'watchedMovies', '[]'::jsonb)) v where v::text ~ '^\d+$' and v::text::int = any(kept_movie_ids)), '[]'::jsonb),
    'movieWatchedDates', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'movieWatchedDates', '{}'::jsonb)) e(k, v) where dated and k ~ '^\d+$' and k::int = any(kept_movie_ids)), '{}'::jsonb),
    'watched', coalesce((select jsonb_agg(v) from jsonb_array_elements_text(coalesce(a -> 'watched', '[]'::jsonb)) v where v ~ '^\d+-\d+-\d+$' and split_part(v, '-', 1)::int = any(kept_show_ids)), '[]'::jsonb),
    'watchedDates', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'watchedDates', '{}'::jsonb)) e(k, v) where dated and k ~ '^\d+-\d+-\d+$' and split_part(k, '-', 1)::int = any(kept_show_ids)), '{}'::jsonb),
    'reactions', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'reactions', '{}'::jsonb)) e(k, v) where private.key_kept(k, kept_show_ids, kept_movie_ids)), '{}'::jsonb),
    'ratings', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'ratings', '{}'::jsonb)) e(k, v) where private.key_kept(k, kept_show_ids, kept_movie_ids) and jsonb_typeof(v) = 'number'), '{}'::jsonb),
    'reviews', coalesce((select jsonb_object_agg(k, private.pick(v, case when dated then array['text', 'watchedOn', 'rewatch', 'spoilers', 'modified'] else array['text', 'rewatch', 'spoilers'] end)) from jsonb_each(coalesce(a -> 'reviews', '{}'::jsonb)) e(k, v) where private.key_kept(k, kept_show_ids, kept_movie_ids) and jsonb_typeof(v) = 'object'), '{}'::jsonb),
    -- A list keeps only the titles that are themselves shown, so it can't
    -- give away something On Hold or Stopped Watching.
    'customLists', coalesce((select jsonb_agg(private.pick(l, array['id', 'name', 'detail', 'created']) || jsonb_build_object(
        'showIDs', coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(l -> 'showIDs', '[]'::jsonb)) v where v::text ~ '^\d+$' and v::text::int = any(kept_show_ids)), '[]'::jsonb),
        'movieIDs', coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(l -> 'movieIDs', '[]'::jsonb)) v where v::text ~ '^\d+$' and v::text::int = any(kept_movie_ids)), '[]'::jsonb)))
      from jsonb_array_elements(coalesce(a -> 'customLists', '[]'::jsonb)) l
      where jsonb_typeof(l) = 'object' and l ? 'id' and l ? 'name'
        -- A list whose eye is off on the profile isn't copied at all.
        and not coalesce((prof.category_privacy ->> ('list:' || (l ->> 'id')))::boolean, false)), '[]'::jsonb),
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

drop trigger if exists profiles_project on public.profiles;
create trigger profiles_project
  after insert or update of username, is_private, suspended_at, show_activity, show_watchlog, show_watchlist, show_watching, category_privacy on public.profiles
  for each row execute function private.on_profile_change();

select private.refresh_projection(user_id) from public.profiles where username is not null;
