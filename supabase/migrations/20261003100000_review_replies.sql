-- Replies can be turned off on a review (decided 3 Oct 2026). The writer
-- says so in the app's review sheet or under Your review here, and the
-- library carries it as `noReplies: true` on the review, absent when replies
-- are on — so every review written before this reads as open.
--
-- Read straight from the library rather than copied into public_entries.
-- The copy is rebuilt by private.refresh_projection, and the live and dev
-- versions of that function had drifted apart when this was written; adding
-- a column meant replacing one or the other. A lookup that stands on its own
-- touches neither, and a boolean is all it ever hands back.

-- Whether the owner of a review has turned replies off. `target` is the
-- review's address: m123, s123 or e123-2-4.
create or replace function private.replies_closed(p_owner uuid, p_target text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((l.archive -> 'reviews' -> (
           case left(p_target, 1)
             when 'm' then 'movie:'
             when 's' then 'show:'
             when 'e' then 'episode:'
           end || substr(p_target, 2)
         ) ->> 'noReplies')::boolean, false)
    from public.libraries l
   where l.user_id = p_owner
$$;
revoke all on function private.replies_closed(uuid, text) from public, anon, authenticated;

-- The same answer for the pages, and only about a review the reader may see:
-- anything else answers false rather than saying whether it exists.
create or replace function public.review_replies_closed(p_owner uuid, p_target text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.can_see(p_owner) and coalesce(private.replies_closed(p_owner, p_target), false)
$$;
revoke all on function public.review_replies_closed(uuid, text) from public;
grant execute on function public.review_replies_closed(uuid, text) to anon, authenticated;

-- The backstop. Comments are written by the server with the service key,
-- which RLS doesn't stop and a trigger does, so a review with replies off
-- refuses one whatever path it came by.
create or replace function private.before_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'review' and coalesce(private.replies_closed(new.owner, new.target), false) then
    raise exception 'replies are off for this review' using errcode = 'check_violation';
  end if;
  return new;
end
$$;
revoke all on function private.before_comment() from public, anon, authenticated;

drop trigger if exists comments_replies_open on public.comments;
create trigger comments_replies_open before insert on public.comments
  for each row execute function private.before_comment();
