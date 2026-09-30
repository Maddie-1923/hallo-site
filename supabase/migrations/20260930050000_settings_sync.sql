-- Settings in the account (docs/social-plan.md, step 1.3), 30 Sep 2026.
--
-- What decides what visitors see goes on the profile, where the database
-- can enforce it: Show recent activity, Show your Watchlog, Let people
-- follow you, and each category's eye (category_privacy, {"list:ID": true}
-- for hidden). Everything else a person sets (notifications, country and
-- services, date format, spoilers, theme) is theirs alone, in
-- user_settings. The browser keeps a copy so the site works signed out; the
-- account's wins when they sign in (lib/settings.ts).
alter table public.profiles
  add column if not exists show_activity boolean not null default true,
  add column if not exists show_watchlog boolean not null default true,
  add column if not exists allow_follows boolean not null default true,
  add column if not exists category_privacy jsonb not null default '{}';

revoke insert, update on public.profiles from anon, authenticated;
grant insert (user_id, display_name, banner_path, avatar_path, banner_focus, is_private, location, quote, show_activity, show_watchlog, allow_follows, category_privacy) on public.profiles to authenticated;
grant update (user_id, display_name, banner_path, avatar_path, banner_focus, is_private, location, quote, show_activity, show_watchlog, allow_follows, category_privacy) on public.profiles to authenticated;

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}' check (pg_column_size(settings) < 65536),
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy "own settings: read"   on public.user_settings for select using ((select auth.uid()) = user_id);
create policy "own settings: insert" on public.user_settings for insert with check ((select auth.uid()) = user_id);
create policy "own settings: update" on public.user_settings for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own settings: delete" on public.user_settings for delete using ((select auth.uid()) = user_id);
drop trigger if exists user_settings_touch on public.user_settings;
create trigger user_settings_touch before update on public.user_settings for each row execute function public.touch_updated_at();

-- The public copy follows the new switches: dates only while the Watchlog
-- or Recent activity is shown, and no hidden lists.
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
begin
  select username, is_private, suspended_at, show_watchlog, show_activity, category_privacy into prof from public.profiles where user_id = uid;
  select archive into a from public.libraries where user_id = uid;

  if a is null or prof.username is null or prof.is_private or prof.suspended_at is not null then
    delete from public.public_entries where user_id = uid;
    delete from public.public_lists where user_id = uid;
    delete from public.public_libraries where user_id = uid;
    return;
  end if;
  dated := coalesce(prof.show_watchlog, true) or coalesce(prof.show_activity, true);

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
revoke all on function private.refresh_projection(uuid) from public, anon, authenticated;

drop trigger if exists profiles_project on public.profiles;
create trigger profiles_project
  after insert or update of username, is_private, suspended_at, show_activity, show_watchlog, category_privacy on public.profiles
  for each row execute function private.on_profile_change();
