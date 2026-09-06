-- One row per person holding the whole library, the same shape the app's
-- iCloud sync pushes as a single CKRecord. Not a table per show: the thing
-- being synced is a few dozen kilobytes that changes when someone taps, and
-- the app already settles two copies record by record with the tombstones and
-- per-record stamps inside the archive. Keeping the server dumb means the
-- iOS side can reuse CloudSync's resolve() almost line for line.

create table public.libraries (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  -- The LibraryArchive JSON exactly as the app encodes it (ISO 8601 dates,
  -- snake_case TMDB keys inside show/movie). jsonb so a future web feature can
  -- index into it; the app never asks the server to interpret it.
  archive     jsonb not null,
  -- Mirrors LibraryArchive.version so a client can refuse a file newer than
  -- it understands rather than decoding it into gaps.
  version     integer not null default 1,
  -- The library's changedAt on the device that wrote this. This is the router
  -- for the three-way comparison in the app: "did the other side move since I
  -- last synced". It is set by the client, never by the server, because the
  -- server's clock says nothing about when the person tapped.
  changed_at  timestamptz not null,
  device      text,
  updated_at  timestamptz not null default now()
);

alter table public.libraries enable row level security;

create policy "own library: read"
  on public.libraries for select
  using (auth.uid() = user_id);

create policy "own library: insert"
  on public.libraries for insert
  with check (auth.uid() = user_id);

create policy "own library: update"
  on public.libraries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own library: delete"
  on public.libraries for delete
  using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger libraries_touch
  before update on public.libraries
  for each row execute function public.touch_updated_at();

-- Size guard. uploadedArt travels inside the archive as base64 and is bounded
-- on the app side (KodigoArtUpload.maximumBytes), so a normal library is tens
-- of kilobytes and a heavy one a few megabytes. Anything past 8 MB is a bug or
-- an abuse, and refusing it here is cheaper than finding out from the bill.
alter table public.libraries
  add constraint archive_size check (pg_column_size(archive) < 8 * 1024 * 1024);
