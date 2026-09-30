-- The hourly timer for the weekly digest and the day's reminders, for the
-- LIVE project once accounts open (with notification-emails.sql beside it).
-- Uses the same CRON_SECRET kept in Vault by notification-emails.sql. It
-- calls https://kodigo.pro/api/scheduled-emails, which sends to whoever's
-- local time makes it due (Sunday 9am digest, 8am reminders).

select cron.schedule(
  'scheduled-emails',
  '2 * * * *',
  $$
  select net.http_post(
    url := 'https://kodigo.pro/api/scheduled-emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'notification_emails_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- To stop it: select cron.unschedule('scheduled-emails');
