-- Fixes from Supabase's advisors after the safety tables (30 Sep 2026).
--
-- is_blocked moves to a `private` schema the API doesn't serve: in `public`
-- anyone, signed in or not, could call /rest/v1/rpc/is_blocked and find out
-- whether two people had blocked each other. The public tables' read
-- policies call private.is_blocked(); the roles can still run it there, it
-- just isn't reachable over the API.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;
revoke all on function private.is_blocked(uuid, uuid) from public;
grant execute on function private.is_blocked(uuid, uuid) to anon, authenticated;

drop function if exists public.is_blocked(uuid, uuid);

-- Indexes for the foreign keys the advisor flagged: finding who blocked a
-- person, a person's reported posts, and a moderator's decisions.
create index if not exists blocks_blocked on public.blocks (blocked);
create index if not exists reports_author on public.reports (author);
create index if not exists reports_resolved_by on public.reports (resolved_by);
