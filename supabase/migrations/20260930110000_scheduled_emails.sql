-- The weekly digest and the day's reminders (docs/social-plan.md, "Email
-- alerts"), 30 Sep 2026: a record of what was sent to whom for which week
-- or day, so each goes once however often the hourly timer runs. Only the
-- service role touches it (app/api/scheduled-emails).
create table if not exists public.scheduled_email_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('digest', 'alerts')),
  -- The local date it was for: the digest's Sunday, the reminders' day.
  period date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, period)
);
alter table public.scheduled_email_log enable row level security;
revoke all on public.scheduled_email_log from anon, authenticated;
