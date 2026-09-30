-- Settings → Privacy → Show what you're watching (30 Sep 2026): whether
-- visitors see the Watching now tab (the series someone is partway through,
-- with their progress). Hides the tab, like Show your watchlist.
alter table public.profiles add column if not exists show_watching boolean not null default true;

revoke insert, update on public.profiles from anon, authenticated;
grant insert (user_id, display_name, banner_path, avatar_path, banner_focus, is_private, location, quote, show_activity, show_watchlog, show_watchlist, show_watching, allow_follows, category_privacy) on public.profiles to authenticated;
grant update (user_id, display_name, banner_path, avatar_path, banner_focus, is_private, location, quote, show_activity, show_watchlog, show_watchlist, show_watching, allow_follows, category_privacy) on public.profiles to authenticated;
