-- The social graph (docs/social-plan.md, step 4), 30 Sep 2026: follows
-- (with requests for private profiles), likes and comments on reviews and
-- lists, and the notifications they send. Everything respects blocks,
-- suspensions and privacy through private.can_see and private.is_blocked.

-- Follows. Following a public profile is immediate; a private one asks, and
-- the owner accepts (or declines by deleting the row). Nobody can follow
-- someone who has switched follows off, or across a block.
create table if not exists public.follows (
  follower uuid not null references auth.users (id) on delete cascade,
  followee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'accepted' check (status in ('accepted', 'pending')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (follower, followee),
  check (follower <> followee)
);
create index if not exists follows_followee on public.follows (followee, status);

-- Who may see a member's public side: they have a username and aren't
-- suspended; they're public, or it's them, or the reader is an accepted
-- follower; and neither has blocked the other.
create or replace function private.can_see(owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = owner and p.username is not null and p.suspended_at is null
      and (not p.is_private or p.user_id = auth.uid()
           or exists (select 1 from public.follows f where f.follower = auth.uid() and f.followee = owner and f.status = 'accepted'))
  ) and not private.is_blocked(auth.uid(), owner);
$$;

create or replace function private.before_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target record;
begin
  if private.is_blocked(new.follower, new.followee) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  select username, is_private, allow_follows, suspended_at into target from public.profiles where user_id = new.followee;
  if target.username is null or target.suspended_at is not null then
    raise exception 'no such member' using errcode = '42501';
  end if;
  if not coalesce(target.allow_follows, true) then
    raise exception 'not taking follows' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.status := case when target.is_private then 'pending' else 'accepted' end;
    new.accepted_at := case when target.is_private then null else now() end;
    new.created_at := now();
  elsif tg_op = 'UPDATE' then
    -- Only a request can change, and only to accepted.
    if old.status <> 'pending' or new.status <> 'accepted' then
      raise exception 'only a request can be accepted' using errcode = '42501';
    end if;
    new.accepted_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists follows_check on public.follows;
create trigger follows_check before insert or update on public.follows for each row execute function private.before_follow();

alter table public.follows enable row level security;
revoke insert, update, delete on public.follows from anon;
revoke update on public.follows from authenticated;
grant update (status) on public.follows to authenticated;
create policy "follows: read" on public.follows for select to anon, authenticated
  using (follower = (select auth.uid()) or followee = (select auth.uid()) or (status = 'accepted' and private.can_see(follower) and private.can_see(followee)));
create policy "follows: follow" on public.follows for insert to authenticated with check (follower = (select auth.uid()));
create policy "follows: accept" on public.follows for update to authenticated using (followee = (select auth.uid())) with check (followee = (select auth.uid()));
create policy "follows: unfollow or remove" on public.follows for delete to authenticated using (follower = (select auth.uid()) or followee = (select auth.uid()));

-- A block ends any follow between the two, both ways.
create or replace function private.end_follows_on_block() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.follows where (follower = new.blocker and followee = new.blocked) or (follower = new.blocked and followee = new.blocker);
  return null;
end;
$$;
drop trigger if exists blocks_end_follows on public.blocks;
create trigger blocks_end_follows after insert on public.blocks for each row execute function private.end_follows_on_block();

-- Whether a review or list exists on a member's public side. A review is
-- keyed as the site keys titles, "m123" or "s123".
create or replace function private.target_exists(kind text, owner uuid, target text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case kind
    when 'review' then exists (
      select 1 from public.public_entries e
      where e.user_id = owner and e.review is not null
        and e.key = case left(target, 1) when 'm' then 'movie:' when 's' then 'show:' end || substr(target, 2))
    when 'list' then exists (select 1 from public.public_lists l where l.user_id = owner and l.id = target)
    else false
  end;
$$;

-- Likes, on reviews and lists.
create table if not exists public.likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('review', 'list')),
  owner uuid not null references auth.users (id) on delete cascade,
  target text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, owner, target)
);
create index if not exists likes_target on public.likes (kind, owner, target);
create index if not exists likes_owner on public.likes (owner);

create or replace function private.before_like() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.target_exists(new.kind, new.owner, new.target) then
    raise exception 'nothing to like' using errcode = '42501';
  end if;
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists likes_check on public.likes;
create trigger likes_check before insert on public.likes for each row execute function private.before_like();

alter table public.likes enable row level security;
revoke insert, update, delete on public.likes from anon;
revoke update on public.likes from authenticated;
create policy "likes: read" on public.likes for select to anon, authenticated
  using (user_id = (select auth.uid()) or (private.can_see(owner) and private.can_see(user_id)));
create policy "likes: like" on public.likes for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_see(owner));
create policy "likes: unlike" on public.likes for delete to authenticated using (user_id = (select auth.uid()));

-- Comments, on reviews and lists. Written only by the server (with the
-- service key, after the word filter and a check that the writer can see
-- the thing: lib/social-actions.ts); the author or the owner of the review
-- or list can delete one.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  author uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('review', 'list')),
  owner uuid not null references auth.users (id) on delete cascade,
  target text not null,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists comments_target on public.comments (kind, owner, target, created_at);
create index if not exists comments_author on public.comments (author);
create index if not exists comments_owner on public.comments (owner);
alter table public.comments enable row level security;
revoke insert, update, delete on public.comments from anon;
revoke insert, update on public.comments from authenticated;
create policy "comments: read" on public.comments for select to anon, authenticated
  using (author = (select auth.uid()) or (private.can_see(owner) and private.can_see(author)));
create policy "comments: delete" on public.comments for delete to authenticated
  using (author = (select auth.uid()) or owner = (select auth.uid()));

-- Notifications: someone followed you (or asked to), accepted your request,
-- liked your review or list, or commented on it. Made by the database as
-- those happen, so nothing can be forged from a browser.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient uuid not null references auth.users (id) on delete cascade,
  actor uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('follow', 'follow_request', 'follow_accepted', 'like', 'comment')),
  target_kind text,
  target text,
  comment_id uuid references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_inbox on public.notifications (recipient, created_at desc);
create index if not exists notifications_actor on public.notifications (actor);
create index if not exists notifications_comment on public.notifications (comment_id);
-- Unliking and liking again doesn't send a second one.
create unique index if not exists notifications_once on public.notifications (recipient, actor, kind, coalesce(target_kind, ''), coalesce(target, ''))
  where kind in ('follow', 'follow_request', 'follow_accepted', 'like');
alter table public.notifications enable row level security;
revoke insert, update, delete on public.notifications from anon;
revoke insert, update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy "notifications: read" on public.notifications for select to authenticated
  using (recipient = (select auth.uid()) and not private.is_blocked(recipient, actor));
create policy "notifications: mark read" on public.notifications for update to authenticated
  using (recipient = (select auth.uid())) with check (recipient = (select auth.uid()));
create policy "notifications: clear" on public.notifications for delete to authenticated using (recipient = (select auth.uid()));

create or replace function private.notify() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if tg_table_name = 'follows' then
      if tg_op = 'INSERT' then
        insert into public.notifications (recipient, actor, kind) values (new.followee, new.follower, case when new.status = 'pending' then 'follow_request' else 'follow' end)
        on conflict do nothing;
      elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
        insert into public.notifications (recipient, actor, kind) values (new.follower, new.followee, 'follow_accepted') on conflict do nothing;
        delete from public.notifications where recipient = new.followee and actor = new.follower and kind = 'follow_request';
      end if;
    -- Each table's own fields are read only inside its own branch: plpgsql
    -- doesn't promise to stop at the first false half of an "and", and a
    -- like's user_id doesn't exist on a comment.
    elsif tg_table_name = 'likes' then
      if new.owner <> new.user_id then
        insert into public.notifications (recipient, actor, kind, target_kind, target) values (new.owner, new.user_id, 'like', new.kind, new.target) on conflict do nothing;
      end if;
    elsif tg_table_name = 'comments' then
      if new.owner <> new.author then
        insert into public.notifications (recipient, actor, kind, target_kind, target, comment_id) values (new.owner, new.author, 'comment', new.kind, new.target, new.id);
      end if;
    end if;
  exception when others then
    raise warning 'notification failed: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end;
$$;
drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert or update on public.follows for each row execute function private.notify();
drop trigger if exists likes_notify on public.likes;
create trigger likes_notify after insert on public.likes for each row execute function private.notify();
drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments for each row execute function private.notify();

revoke all on function private.before_follow(), private.end_follows_on_block(), private.before_like(), private.notify() from public, anon, authenticated;
revoke all on function private.target_exists(text, uuid, text) from public;
grant execute on function private.target_exists(text, uuid, text) to anon, authenticated;

-- The public copy is kept for private accounts now (see above).
create or replace function private.refresh_projection(uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a jsonb;
  prof record;
  pub jsonb;
  shows_kept jsonb;
  movies_kept jsonb;
  kept_show_ids int[];
  kept_movie_ids int[];
  -- Watch dates are copied only while the Watchlog or Recent activity is
  -- shown; with both off, visitors can't learn when anything was watched.
  dated boolean;
begin
  select username, is_private, suspended_at, show_watchlog, show_activity, category_privacy into prof from public.profiles where user_id = uid;
  select archive into a from public.libraries where user_id = uid;

  -- A private account keeps its copy now: approved followers read it
  -- (private.can_see decides who). No username or a suspension still means
  -- none at all.
  if a is null or prof.username is null or prof.suspended_at is not null then
    delete from public.public_entries where user_id = uid;
    delete from public.public_lists where user_id = uid;
    delete from public.public_libraries where user_id = uid;
    return;
  end if;
  dated := coalesce(prof.show_watchlog, true) or coalesce(prof.show_activity, true);

  -- The titles that can be shown, with only the fields the pages use.
  select coalesce(jsonb_agg(jsonb_build_object(
           'show', private.pick(s -> 'show', array['id', 'name', 'poster_path', 'backdrop_path', 'first_air_date', 'vote_average', 'status', 'genre_ids']),
           'status', s -> 'status', 'added', s -> 'added')), '[]'::jsonb),
         coalesce(array_agg((s -> 'show' ->> 'id')::int), '{}')
    into shows_kept, kept_show_ids
    from jsonb_array_elements(coalesce(a -> 'shows', '[]'::jsonb)) s
   where s -> 'show' ->> 'id' ~ '^\d+$' and coalesce(s ->> 'status', '') not in ('Stopped', 'Dropped');

  select coalesce(jsonb_agg(jsonb_build_object(
           'movie', private.pick(m -> 'movie', array['id', 'title', 'poster_path', 'backdrop_path', 'release_date', 'vote_average', 'runtime', 'genre_ids']),
           'status', m -> 'status', 'added', m -> 'added')), '[]'::jsonb),
         coalesce(array_agg((m -> 'movie' ->> 'id')::int), '{}')
    into movies_kept, kept_movie_ids
    from jsonb_array_elements(coalesce(a -> 'movies', '[]'::jsonb)) m
   where m -> 'movie' ->> 'id' ~ '^\d+$' and coalesce(m ->> 'status', '') not in ('On Hold', 'Dropped');

  pub := jsonb_build_object(
    'version', coalesce(a -> 'version', '12'::jsonb),
    'exported', '',
    'device', '',
    'shows', shows_kept,
    'movies', movies_kept,
    'watchedMovies', coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(a -> 'watchedMovies', '[]'::jsonb)) v where v::text ~ '^\d+$' and v::text::int = any(kept_movie_ids)), '[]'::jsonb),
    'movieWatchedDates', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'movieWatchedDates', '{}'::jsonb)) e(k, v) where dated and k ~ '^\d+$' and k::int = any(kept_movie_ids)), '{}'::jsonb),
    'watched', coalesce((select jsonb_agg(v) from jsonb_array_elements_text(coalesce(a -> 'watched', '[]'::jsonb)) v where v ~ '^\d+-\d+-\d+$' and split_part(v, '-', 1)::int = any(kept_show_ids)), '[]'::jsonb),
    'watchedDates', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'watchedDates', '{}'::jsonb)) e(k, v) where dated and k ~ '^\d+-\d+-\d+$' and split_part(k, '-', 1)::int = any(kept_show_ids)), '{}'::jsonb),
    'reactions', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'reactions', '{}'::jsonb)) e(k, v) where private.key_kept(k, kept_show_ids, kept_movie_ids)), '{}'::jsonb),
    'ratings', coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(a -> 'ratings', '{}'::jsonb)) e(k, v) where private.key_kept(k, kept_show_ids, kept_movie_ids) and jsonb_typeof(v) = 'number'), '{}'::jsonb),
    'reviews', coalesce((select jsonb_object_agg(k, private.pick(v, case when dated then array['text', 'watchedOn', 'rewatch', 'spoilers', 'modified'] else array['text', 'rewatch', 'spoilers'] end)) from jsonb_each(coalesce(a -> 'reviews', '{}'::jsonb)) e(k, v) where private.key_kept(k, kept_show_ids, kept_movie_ids) and jsonb_typeof(v) = 'object'), '{}'::jsonb),
    -- A list keeps only the titles that are themselves shown, so it can't
    -- give away something On Hold or Stopped Watching.
    'customLists', coalesce((select jsonb_agg(private.pick(l, array['id', 'name', 'detail', 'created']) || jsonb_build_object(
        'showIDs', coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(l -> 'showIDs', '[]'::jsonb)) v where v::text ~ '^\d+$' and v::text::int = any(kept_show_ids)), '[]'::jsonb),
        'movieIDs', coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(l -> 'movieIDs', '[]'::jsonb)) v where v::text ~ '^\d+$' and v::text::int = any(kept_movie_ids)), '[]'::jsonb)))
      from jsonb_array_elements(coalesce(a -> 'customLists', '[]'::jsonb)) l
      where jsonb_typeof(l) = 'object' and l ? 'id' and l ? 'name'
        -- A list whose eye is off on the profile isn't copied at all.
        and not coalesce((prof.category_privacy ->> ('list:' || (l ->> 'id')))::boolean, false)), '[]'::jsonb),
    'customListOrder', coalesce(a -> 'customListOrder', '[]'::jsonb)
  );

  insert into public.public_libraries (user_id, archive) values (uid, pub)
  on conflict (user_id) do update set archive = excluded.archive, updated_at = now()
  where public.public_libraries.archive is distinct from excluded.archive;

  -- Entries: every kept title or episode with a rating, reaction or review.
  with keys as (
    select k from jsonb_object_keys(pub -> 'ratings') k
    union select k from jsonb_object_keys(pub -> 'reactions') k
    union select k from jsonb_object_keys(pub -> 'reviews') k
  ),
  titles as (
    select 'show' as kind, (s -> 'show' ->> 'id')::int as id, s -> 'show' ->> 'name' as title, s -> 'show' ->> 'poster_path' as poster, s -> 'show' ->> 'backdrop_path' as backdrop, left(s -> 'show' ->> 'first_air_date', 4) as year
      from jsonb_array_elements(pub -> 'shows') s
    union all
    select 'movie', (m -> 'movie' ->> 'id')::int, m -> 'movie' ->> 'title', m -> 'movie' ->> 'poster_path', m -> 'movie' ->> 'backdrop_path', left(m -> 'movie' ->> 'release_date', 4)
      from jsonb_array_elements(pub -> 'movies') m
  ),
  fresh as (
    select keys.k as key,
           split_part(keys.k, ':', 1) as kind,
           t.id as tmdb_id,
           case when keys.k like 'episode:%' then substr(split_part(keys.k, ':', 2), length(split_part(split_part(keys.k, ':', 2), '-', 1)) + 2) end as episode,
           coalesce(t.title, '') as title, t.poster, t.backdrop, t.year,
           (pub -> 'ratings' ->> keys.k)::numeric(3, 1) as rating,
           pub -> 'reactions' ->> keys.k as reaction,
           nullif(btrim(pub -> 'reviews' -> keys.k ->> 'text'), '') as review,
           coalesce((pub -> 'reviews' -> keys.k ->> 'spoilers')::boolean, false) as spoilers,
           coalesce(
             case when (pub -> 'reviews' -> keys.k ->> 'watchedOn') ~ '^\d{4}-\d{2}-\d{2}' then left(pub -> 'reviews' -> keys.k ->> 'watchedOn', 10)::date end,
             case when keys.k like 'movie:%' and (pub -> 'movieWatchedDates' ->> split_part(keys.k, ':', 2)) ~ '^\d{4}-\d{2}-\d{2}' then left(pub -> 'movieWatchedDates' ->> split_part(keys.k, ':', 2), 10)::date end,
             case when keys.k like 'episode:%' and (pub -> 'watchedDates' ->> split_part(keys.k, ':', 2)) ~ '^\d{4}-\d{2}-\d{2}' then left(pub -> 'watchedDates' ->> split_part(keys.k, ':', 2), 10)::date end
           ) as watched_on,
           coalesce((pub -> 'reviews' -> keys.k ->> 'rewatch')::boolean, false) as rewatch
      from keys
      join titles t on t.kind = case when keys.k like 'episode:%' then 'show' else split_part(keys.k, ':', 1) end
                   and t.id = case when keys.k like 'episode:%' then split_part(split_part(keys.k, ':', 2), '-', 1)::int else split_part(keys.k, ':', 2)::int end
  ),
  gone as (
    delete from public.public_entries e where e.user_id = uid and not exists (select 1 from fresh f where f.key = e.key)
  )
  insert into public.public_entries (user_id, key, kind, tmdb_id, episode, title, poster_path, backdrop_path, year, rating, reaction, review, spoilers, watched_on, rewatch)
  select uid, key, kind, tmdb_id, episode, title, poster, backdrop, year, rating, reaction, review, spoilers, watched_on, rewatch from fresh
  on conflict (user_id, key) do update set
    kind = excluded.kind, tmdb_id = excluded.tmdb_id, episode = excluded.episode, title = excluded.title,
    poster_path = excluded.poster_path, backdrop_path = excluded.backdrop_path, year = excluded.year,
    rating = excluded.rating, reaction = excluded.reaction, review = excluded.review, spoilers = excluded.spoilers,
    watched_on = excluded.watched_on, rewatch = excluded.rewatch, updated_at = now()
  where (public.public_entries.rating, public.public_entries.reaction, public.public_entries.review, public.public_entries.spoilers, public.public_entries.watched_on, public.public_entries.rewatch, public.public_entries.title, public.public_entries.poster_path)
        is distinct from (excluded.rating, excluded.reaction, excluded.review, excluded.spoilers, excluded.watched_on, excluded.rewatch, excluded.title, excluded.poster_path);

  -- Lists.
  with fresh as (
    select l ->> 'id' as id, l ->> 'name' as name, l ->> 'detail' as detail,
           coalesce(array(select v::int from jsonb_array_elements_text(coalesce(l -> 'showIDs', '[]'::jsonb)) v where v ~ '^\d+$'), '{}') as show_ids,
           coalesce(array(select v::int from jsonb_array_elements_text(coalesce(l -> 'movieIDs', '[]'::jsonb)) v where v ~ '^\d+$'), '{}') as movie_ids,
           case when (l ->> 'created') ~ '^\d{4}-\d{2}-\d{2}' then (l ->> 'created')::timestamptz end as created,
           coalesce((select jsonb_agg(x.o order by x.g, x.n) from (
             select 1 as g, i.n, jsonb_build_object('kind', 'show', 'id', (s -> 'show' ->> 'id')::int, 'title', s -> 'show' ->> 'name', 'poster_path', s -> 'show' ->> 'poster_path', 'backdrop_path', s -> 'show' ->> 'backdrop_path', 'year', left(s -> 'show' ->> 'first_air_date', 4)) as o
               from jsonb_array_elements_text(coalesce(l -> 'showIDs', '[]'::jsonb)) with ordinality i(v, n)
               join jsonb_array_elements(pub -> 'shows') s on s -> 'show' ->> 'id' = i.v
             union all
             select 2, i.n, jsonb_build_object('kind', 'movie', 'id', (m -> 'movie' ->> 'id')::int, 'title', m -> 'movie' ->> 'title', 'poster_path', m -> 'movie' ->> 'poster_path', 'backdrop_path', m -> 'movie' ->> 'backdrop_path', 'year', left(m -> 'movie' ->> 'release_date', 4))
               from jsonb_array_elements_text(coalesce(l -> 'movieIDs', '[]'::jsonb)) with ordinality i(v, n)
               join jsonb_array_elements(pub -> 'movies') m on m -> 'movie' ->> 'id' = i.v
           ) x), '[]'::jsonb) as titles
      from jsonb_array_elements(pub -> 'customLists') l
  ),
  gone as (
    delete from public.public_lists p where p.user_id = uid and not exists (select 1 from fresh f where f.id = p.id)
  )
  insert into public.public_lists (user_id, id, name, detail, show_ids, movie_ids, titles, created)
  select uid, id, name, detail, show_ids, movie_ids, titles, created from fresh
  on conflict (user_id, id) do update set name = excluded.name, detail = excluded.detail, show_ids = excluded.show_ids, movie_ids = excluded.movie_ids, titles = excluded.titles, created = excluded.created, updated_at = now()
  where (public.public_lists.name, public.public_lists.detail, public.public_lists.show_ids, public.public_lists.movie_ids, public.public_lists.titles) is distinct from (excluded.name, excluded.detail, excluded.show_ids, excluded.movie_ids, excluded.titles);
end;
$$;
revoke all on function private.refresh_projection(uuid) from public, anon, authenticated;
select private.refresh_projection(user_id) from public.profiles where username is not null and is_private;
