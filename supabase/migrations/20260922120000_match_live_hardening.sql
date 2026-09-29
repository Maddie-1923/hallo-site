-- What the live project already has and the files above didn't say, found by
-- comparing them on 30 Sep 2026 (applied to live by hand around 19–22 Sep,
-- from Supabase's security and performance advisors):
-- - the library policies ask for auth.uid() once per query rather than once
--   per row, as the profile policies already did;
-- - touch_updated_at has a fixed search_path, so nothing can slip a
--   look-alike now() in ahead of it.
-- Safe to run again.
alter policy "own library: read"   on public.libraries using ((select auth.uid()) = user_id);
alter policy "own library: insert" on public.libraries with check ((select auth.uid()) = user_id);
alter policy "own library: update" on public.libraries using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own library: delete" on public.libraries using ((select auth.uid()) = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;
