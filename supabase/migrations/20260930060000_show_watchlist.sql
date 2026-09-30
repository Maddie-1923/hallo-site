-- Settings → Privacy → Show your watchlist (30 Sep 2026): whether visitors
-- see the Watchlist tab on the profile. Like Recent activity, it hides the
-- tab rather than the titles, which are in the public copy anyway (a film
-- To Watch is part of the library's shape, as the stats show).
alter table public.profiles add column if not exists show_watchlist boolean not null default true;

revoke insert, update on public.profiles from anon, authenticated;
grant insert (user_id, display_name, banner_path, avatar_path, banner_focus, is_private, location, quote, show_activity, show_watchlog, show_watchlist, allow_follows, category_privacy) on public.profiles to authenticated;
grant update (user_id, display_name, banner_path, avatar_path, banner_focus, is_private, location, quote, show_activity, show_watchlog, show_watchlist, allow_follows, category_privacy) on public.profiles to authenticated;
