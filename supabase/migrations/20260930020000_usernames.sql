-- Usernames and public profiles (docs/social-plan.md, step 1.1).
--
-- A profile becomes public once it has a username; until then nothing of the
-- account shows anywhere. Choosing one is also the one-time notice that
-- profiles are public, with the private switch beside it
-- (/profile/setup), so nobody who had a library before profiles existed is
-- made public without being told.
alter table public.profiles
  add column if not exists username text,
  add column if not exists is_private boolean not null default false,
  add column if not exists location text,
  add column if not exists quote text;

-- The shape lib/word-filter.ts checkUsername() allows: 3 to 20 lower-case
-- letters, digits, dots and underscores, starting and ending with a letter
-- or digit, never two dots or underscores in a row.
alter table public.profiles drop constraint if exists profiles_username_shape;
alter table public.profiles add constraint profiles_username_shape
  check (username is null or (username ~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' and username !~ '[._]{2}'));
alter table public.profiles drop constraint if exists profiles_text_lengths;
alter table public.profiles add constraint profiles_text_lengths
  check (coalesce(char_length(display_name), 0) <= 40 and coalesce(char_length(location), 0) <= 60 and coalesce(char_length(quote), 0) <= 140);

create unique index if not exists profiles_username on public.profiles (username) where username is not null;

-- The username (and a suspension) are written only by the server with the
-- service key, after the word filter and the reserved names; a browser can
-- write everything else on its own row. user_id is in the update list
-- because an upsert names it; the row policies still pin it to the owner.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (user_id, display_name, banner_path, avatar_path, banner_focus, is_private, location, quote) on public.profiles to authenticated;
grant update (user_id, display_name, banner_path, avatar_path, banner_focus, is_private, location, quote) on public.profiles to authenticated;

-- Anyone can read a profile that has a username, unless it's suspended or
-- either of the two has blocked the other. (What's on a private profile
-- beyond its card is decided by the public tables, step 1.2.)
drop policy if exists "public profiles: read" on public.profiles;
create policy "public profiles: read" on public.profiles for select to anon, authenticated
  using (username is not null and suspended_at is null and not private.is_blocked((select auth.uid()), user_id));
