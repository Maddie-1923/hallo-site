-- Episode reviews can be liked (3 Oct 2026). target_exists read a review's
-- address as m… or s… only, so an episode's e123-2-4 turned into a null key,
-- matched nothing, and every like on one was refused as "nothing to like".
-- The same three prefixes the replies switch reads
-- (20261003100000_review_replies.sql).
create or replace function private.target_exists(kind text, owner uuid, target text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case kind
    when 'review' then exists (
      select 1 from public.public_entries e
      where e.user_id = owner and e.review is not null
        and e.key = case left(target, 1) when 'm' then 'movie:' when 's' then 'show:' when 'e' then 'episode:' end || substr(target, 2))
    when 'list' then exists (select 1 from public.public_lists l where l.user_id = owner and l.id = target)
    else false
  end;
$$;
