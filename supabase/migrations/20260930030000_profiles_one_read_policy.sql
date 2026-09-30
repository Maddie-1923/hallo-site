-- One read policy on profiles instead of two (the performance advisor: each
-- permissive policy runs on every row). Same rule: your own row always, and
-- anyone's once it has a username, unless suspended or blocked either way.
drop policy if exists "own profile: read" on public.profiles;
drop policy if exists "public profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles for select to anon, authenticated
  using (
    (select auth.uid()) = user_id
    or (username is not null and suspended_at is null and not private.is_blocked((select auth.uid()), user_id))
  );
