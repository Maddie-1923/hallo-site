-- The ten-minute timer that sends notification emails, for the LIVE project
-- once the site opens (not kodigo-dev, whose site runs on a laptop Supabase
-- can't reach; there the route is called by hand). Run once in the SQL
-- editor, after:
--   1. Vercel has CRON_SECRET (a long random string) and RESEND_API_KEY set,
--      and the site is deployed;
--   2. the same CRON_SECRET is stored in Vault below.
-- It calls https://kodigo.pro/api/notification-emails, which does the rest.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('<the same CRON_SECRET as on Vercel>', 'notification_emails_cron_secret');

select cron.schedule(
  'notification-emails',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://kodigo.pro/api/notification-emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'notification_emails_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- To stop it: select cron.unschedule('notification-emails');
