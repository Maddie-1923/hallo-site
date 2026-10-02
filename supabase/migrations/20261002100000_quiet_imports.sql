-- Imported reviews and ratings arrive quietly (decided 2 Oct 2026): they show
-- on the person's profile and the title pages, dated as they were written,
-- but never in followers' feeds or the weekly digest, so bringing over 300
-- old Letterboxd reviews doesn't flood anyone.
--
-- An import, on the web or in either app, stamps the archive's `importedAt`
-- (ISO time). The first projection refresh to see a newer stamp than the one
-- recorded here is the import's own write: every entry it touched (their
-- updated_at is this transaction's now()) is marked quiet and dated from the
-- review's `modified`, else the day it was watched. Any later change to an
-- entry, a real edit, makes it ordinary again.

alter table public.public_entries add column if not exists quiet boolean not null default false;

create table if not exists private.projection_imports (
  user_id uuid primary key references auth.users (id) on delete cascade,
  imported_at timestamptz not null
);

create or replace function private.settle_import(uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a jsonb;
  stamp timestamptz;
  seen timestamptz;
begin
  select archive into a from public.libraries where user_id = uid;
  if a is not null and (a ->> 'importedAt') ~ '^\d{4}-\d{2}-\d{2}T' then
    stamp := (a ->> 'importedAt')::timestamptz;
  end if;
  select imported_at into seen from private.projection_imports where user_id = uid;

  if stamp is not null and (seen is null or stamp > seen) then
    update public.public_entries e set
      quiet = true,
      updated_at = least(now(), coalesce(
        case when (a -> 'reviews' -> e.key ->> 'modified') ~ '^\d{4}-\d{2}-\d{2}T' then (a -> 'reviews' -> e.key ->> 'modified')::timestamptz end,
        e.watched_on::timestamptz + interval '12 hours',
        now()))
    where e.user_id = uid and e.updated_at = now();
    insert into private.projection_imports (user_id, imported_at) values (uid, stamp)
    on conflict (user_id) do update set imported_at = excluded.imported_at;
  else
    update public.public_entries e set quiet = false
    where e.user_id = uid and e.updated_at = now() and e.quiet;
  end if;
end;
$$;
revoke all on function private.settle_import(uuid) from public, anon, authenticated;

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
  return null;
end;
$$;

-- What's already there predates imports carrying the stamp: record each
-- library's current one, if any, so it isn't taken as a new import.
insert into private.projection_imports (user_id, imported_at)
select user_id, (archive ->> 'importedAt')::timestamptz from public.libraries
where (archive ->> 'importedAt') ~ '^\d{4}-\d{2}-\d{2}T'
on conflict (user_id) do nothing;
