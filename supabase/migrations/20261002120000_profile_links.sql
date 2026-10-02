-- Links on the profile card (2 Oct 2026): up to three addresses of the
-- person's own (YouTube, X, Instagram, a website…), under the location and
-- quote. Web addresses only, each at most 200 characters; the site checks
-- the shape before saving and draws them as plain outbound links.

alter table public.profiles add column if not exists links text[] not null default '{}';

-- A check can't hold a subquery, so the shape test is a function.
create or replace function private.links_ok(links text[]) returns boolean
language sql immutable set search_path = '' as $$
  select cardinality(links) <= 3
     and coalesce((select bool_and(l ~ '^https?://[^\s]+$' and char_length(l) <= 200) from unnest(links) l), true);
$$;
-- The check runs as whoever writes the row.
grant execute on function private.links_ok(text[]) to authenticated;

alter table public.profiles drop constraint if exists profiles_links_shape;
alter table public.profiles add constraint profiles_links_shape check (private.links_ok(links));

grant insert (links) on public.profiles to authenticated;
grant update (links) on public.profiles to authenticated;
