-- Web-only profile dressing: the banner and avatar a person picks for their
-- My Lists page and a display name. Kept apart from the library row on
-- purpose — the phone decodes the archive with Swift structs that drop keys
-- they don't know, so anything stored inside it that the app doesn't model
-- would vanish on the next sync from a phone.
create table public.profiles (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  -- TMDB paths, the same kind the archive carries; the page builds the URL.
  banner_path   text,
  avatar_path   text,
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile: read"   on public.profiles for select using ((select auth.uid()) = user_id);
create policy "own profile: insert" on public.profiles for insert with check ((select auth.uid()) = user_id);
create policy "own profile: update" on public.profiles for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own profile: delete" on public.profiles for delete using ((select auth.uid()) = user_id);

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();
