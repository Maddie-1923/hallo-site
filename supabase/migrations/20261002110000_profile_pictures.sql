-- Profile pictures as the app keeps them (2 Oct 2026): the photo and banner
-- are finished JPEG crops inside the library archive (`profileAvatar`,
-- `profileBanner`, base64, and `profilePicturesChanged` for when the pair
-- last changed), so the phone and the website show the same two pictures.
-- The site serves them from /api/pictures/<username>/<avatar|banner>.
--
-- The archive is large and private, so the profile row says whether there
-- is a picture to ask for and when it last changed (the address carries
-- that, so a new picture is a new address and the old one can be cached for
-- good). Kept from the archive by the library trigger; nobody writes these
-- columns themselves (they aren't in the column grants).
-- The public projection still copies no pictures.

alter table public.profiles
  add column if not exists has_avatar boolean not null default false,
  add column if not exists has_banner boolean not null default false,
  add column if not exists picture_changed timestamptz;

-- What a library's archive says about its pictures. A picture without a
-- stamp (it shouldn't happen) takes the row's own change time, so its
-- address still moves when it does.
create or replace function private.picture_state(uid uuid, out has_avatar boolean, out has_banner boolean, out changed timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  a jsonb;
  row_changed timestamptz;
begin
  select l.archive, l.changed_at into a, row_changed from public.libraries l where l.user_id = uid;
  has_avatar := coalesce(jsonb_typeof(a -> 'profileAvatar') = 'string' and length(a ->> 'profileAvatar') > 0, false);
  has_banner := coalesce(jsonb_typeof(a -> 'profileBanner') = 'string' and length(a ->> 'profileBanner') > 0, false);
  changed := null;
  if has_avatar or has_banner then
    if (a ->> 'profilePicturesChanged') ~ '^\d{4}-\d{2}-\d{2}T' then
      begin
        changed := (a ->> 'profilePicturesChanged')::timestamptz;
      exception when others then
        changed := null;
      end;
    end if;
    changed := coalesce(changed, row_changed);
  end if;
end;
$$;
revoke all on function private.picture_state(uuid) from public, anon, authenticated;

-- Copies that onto the profile row, when it has one and something moved.
create or replace function private.sync_pictures(uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s record;
begin
  select * into s from private.picture_state(uid);
  update public.profiles p set has_avatar = s.has_avatar, has_banner = s.has_banner, picture_changed = s.changed
  where p.user_id = uid and (p.has_avatar, p.has_banner, p.picture_changed) is distinct from (s.has_avatar, s.has_banner, s.changed);
end;
$$;
revoke all on function private.sync_pictures(uuid) from public, anon, authenticated;

-- The library trigger as before (the projection and the import settling),
-- with the pictures after it in a guard of their own, so a failure there
-- can't undo the projection, and neither can stop the write that fired it.
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
      perform private.settle_import(new.user_id);
    end if;
  exception when others then
    raise warning 'public projection failed for %: % (%)', coalesce(new.user_id, old.user_id), sqlerrm, sqlstate;
  end;
  begin
    perform private.sync_pictures(coalesce(new.user_id, old.user_id));
  exception when others then
    raise warning 'profile pictures failed for %: % (%)', coalesce(new.user_id, old.user_id), sqlerrm, sqlstate;
  end;
  return null;
end;
$$;

-- A profile row made after the library (choosing a username comes later
-- than the first sync) starts with what the library already holds.
create or replace function private.on_profile_insert_pictures() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  s record;
begin
  begin
    select * into s from private.picture_state(new.user_id);
    new.has_avatar := s.has_avatar;
    new.has_banner := s.has_banner;
    new.picture_changed := s.changed;
  exception when others then
    new.has_avatar := false;
    new.has_banner := false;
    new.picture_changed := null;
  end;
  return new;
end;
$$;

drop trigger if exists profiles_pictures on public.profiles;
create trigger profiles_pictures
  before insert on public.profiles
  for each row execute function private.on_profile_insert_pictures();

-- Everyone who already has pictures in their library.
select private.sync_pictures(user_id) from public.libraries;

-- The Members page needs the same two facts to build each photo's address.
-- Its columns change, so it's dropped and made again (same body otherwise
-- as 20260930150000_member_stats.sql).
drop function if exists public.member_directory(integer);
create function public.member_directory(max_rows integer default 500)
returns table (
  user_id uuid, username text, display_name text, avatar_path text, has_avatar boolean, picture_changed timestamptz,
  location text, quote text, joined timestamptz,
  followers bigint, following bigint, reviews bigint, titles integer, likes_this_week bigint, my_follow text
)
language sql stable security invoker set search_path = '' as $$
  select p.user_id, p.username, p.display_name, p.avatar_path, p.has_avatar, p.picture_changed, p.location, p.quote, p.created_at,
    coalesce(s.followers, 0)::bigint, coalesce(s.following, 0)::bigint, coalesce(s.reviews, 0)::bigint,
    coalesce(s.titles, 0), coalesce(s.likes_this_week, 0)::bigint,
    (select f.status from public.follows f where f.follower = auth.uid() and f.followee = p.user_id)
  from public.profiles p
  left join public.member_stats s on s.user_id = p.user_id
  where p.username is not null and not p.is_private and p.suspended_at is null
  order by 10 desc, p.created_at desc
  limit least(greatest(max_rows, 1), 1000);
$$;
revoke all on function public.member_directory(integer) from public;
grant execute on function public.member_directory(integer) to anon, authenticated;
