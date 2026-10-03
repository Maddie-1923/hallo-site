-- Whether a password is the one the email timers keep in Vault (3 Oct 2026).
-- The timers' routes ask this (lib/cron-auth.ts) instead of comparing with a
-- copy pasted into Vercel, which differed by an invisible character when the
-- site opened and refused every call. Only the site's server, with the
-- service role, can ask; it answers yes or no and never returns the password.
create or replace function public.cron_token_ok(token text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'notification_emails_cron_secret' and decrypted_secret = token
  );
$$;
revoke all on function public.cron_token_ok(text) from public, anon, authenticated;
grant execute on function public.cron_token_ok(text) to service_role;
