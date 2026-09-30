-- Notification emails (docs/social-plan.md, step 4), 30 Sep 2026.
--
-- The bell's notifications, also sent by email as Settings → Notifications
-- asks: one email per person per batch, never more than one an hour, none for
-- what they've already seen on the site, none about someone blocked either
-- way, and none for a kind they've switched off. The website sends them
-- (app/api/notification-emails): every ten minutes it asks
-- claim_notification_emails for the batch, sends it through Resend, and hands
-- back anything that failed with release_notification_emails. Both run only
-- with the service role key; nobody's browser can call them.

alter table public.notifications add column if not exists emailed_at timestamptz;
-- Everything made before this is already in people's bells; none of it is
-- sent now.
update public.notifications set emailed_at = coalesce(read_at, created_at) where emailed_at is null;
create index if not exists notifications_unemailed on public.notifications (created_at) where emailed_at is null;

-- When each person was last emailed, for the once-an-hour rule.
create table if not exists private.notification_email_log (
  recipient uuid primary key references auth.users (id) on delete cascade,
  last_sent_at timestamptz not null
);

-- Whether a person wants email for a kind of notification. Settings keeps the
-- switches in user_settings (lib/settings-shape.ts); a switch never touched
-- is on, as its default there says.
create or replace function private.wants_email(uid uuid, kind text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select (s.settings ->> case when kind = 'like' then 'notifyLikes' when kind = 'comment' then 'notifyComments' else 'notifyFollows' end)::boolean
    from public.user_settings s where s.user_id = uid
  ), true);
$$;

create or replace function public.claim_notification_emails(max_people int default 200)
returns table (recipient uuid, email text, username text, items jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  -- What will never be emailed is settled first, so it doesn't wait in the
  -- queue: already seen on the site, about someone blocked either way, a
  -- kind they've switched off, or older than a day (a person away from
  -- email doesn't come back to a stale pile).
  update public.notifications n set emailed_at = now()
  where n.emailed_at is null
    and (n.read_at is not null
      or private.is_blocked(n.recipient, n.actor)
      or not private.wants_email(n.recipient, n.kind)
      or n.created_at < now() - interval '1 day');

  return query
  with people as (
    -- Two minutes' grace, so a like taken straight back or a burst of
    -- activity lands in one email; then at most one email an hour.
    select distinct n.recipient
    from public.notifications n
    left join private.notification_email_log l on l.recipient = n.recipient
    where n.emailed_at is null
      and n.created_at < now() - interval '2 minutes'
      and (l.last_sent_at is null or l.last_sent_at < now() - interval '1 hour')
    limit max_people
  ),
  claimed as (
    update public.notifications n set emailed_at = now()
    from people p
    where n.recipient = p.recipient and n.emailed_at is null
    returning n.*
  ),
  logged as (
    insert into private.notification_email_log (recipient, last_sent_at)
    select distinct c.recipient, now() from claimed c
    on conflict on constraint notification_email_log_pkey do update set last_sent_at = excluded.last_sent_at
    returning 1
  )
  select c.recipient,
         u.email::text,
         rp.username,
         jsonb_agg(jsonb_build_object(
           'id', c.id,
           'kind', c.kind,
           'who', ap.username,
           'targetKind', c.target_kind,
           'target', c.target,
           'subject', coalesce(
             (select e.title from public.public_entries e
               where c.target_kind = 'review' and e.user_id = c.recipient and e.kind in ('movie', 'show')
                 and (case when e.kind = 'movie' then 'm' else 's' end) || e.tmdb_id = c.target limit 1),
             (select pl.name from public.public_lists pl where c.target_kind = 'list' and pl.user_id = c.recipient and pl.id = c.target limit 1)),
           'text', (select left(cm.body, 200) from public.comments cm where cm.id = c.comment_id),
           'at', c.created_at
         ) order by c.created_at desc)
  from claimed c
  join auth.users u on u.id = c.recipient
  join public.profiles rp on rp.user_id = c.recipient
  join public.profiles ap on ap.user_id = c.actor
  where u.email is not null and rp.username is not null and ap.username is not null
  group by c.recipient, u.email, rp.username;
end;
$$;

-- A batch that couldn't be sent goes back in the queue for the next run.
create or replace function public.release_notification_emails(ids uuid[]) returns void
language sql security definer set search_path = '' as $$
  update public.notifications set emailed_at = null where id = any(ids);
  delete from private.notification_email_log l
  where l.recipient in (select n.recipient from public.notifications n where n.id = any(ids));
$$;

revoke all on function public.claim_notification_emails(int), public.release_notification_emails(uuid[]), private.wants_email(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_notification_emails(int), public.release_notification_emails(uuid[]) to service_role;
