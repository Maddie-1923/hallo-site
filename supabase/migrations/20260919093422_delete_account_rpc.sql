-- Account deletion, callable by the signed-in account and nobody else.
-- App Review 5.1.1(v): an app that creates accounts must be able to delete
-- them. The anon key can't touch auth.users and the service-role key must never
-- ship in a binary, so the delete lives here as a security-definer function
-- that can only ever act on auth.uid(). libraries and profiles cascade from
-- auth.users. (Applied to the live project on 19 Sep and revised on 22 Sep to
-- stop deleting storage objects directly; this file is the 22 Sep version.)
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public;
revoke all on function public.delete_account() from anon;
grant execute on function public.delete_account() to authenticated;
