-- Hand-picked favourites (3 Oct 2026): a member's top five films and top five
-- shows, chosen in the app or on the profile's Favourites card. Kept on the
-- profile, where every visitor reads them, as
--   { "movie": [{ key, title, poster, year }], "show": [...] }
-- with keys "m<id>" and "s<id>" and at most five a side. Null means automatic:
-- hearts first, then the best rated — what the card shows until somebody
-- chooses.
alter table public.profiles add column if not exists favourites jsonb;

alter table public.profiles drop constraint if exists profiles_favourites_shape;
alter table public.profiles add constraint profiles_favourites_shape check (
  favourites is null or (
    jsonb_typeof(favourites) = 'object'
    and coalesce(jsonb_array_length(case when jsonb_typeof(favourites -> 'movie') = 'array' then favourites -> 'movie' end), 0) <= 5
    and coalesce(jsonb_array_length(case when jsonb_typeof(favourites -> 'show') = 'array' then favourites -> 'show' end), 0) <= 5
    and pg_column_size(favourites) <= 8192
  )
);

grant insert (favourites), update (favourites) on public.profiles to authenticated;
