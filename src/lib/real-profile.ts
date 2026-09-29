import "server-only";
import { isArchive, type LibraryArchive } from "@/lib/archive";
import { profileFromArchive, withAiredEpisodes, withUpToDate, type PublicProfileView } from "@/lib/public-profile";
import { createClient } from "@/lib/supabase/server";
import { image } from "@/lib/tmdb";

// A real member's profile at /u/<username>, once accounts are open. The
// profile row is public once it has a username (supabase/migrations/
// 20260930020000_usernames.sql): unknown, suspended or blocked-either-way
// usernames come back as nothing, which the page turns into a 404.
//
// The owner sees their whole profile, drawn from their own library. Anyone
// else sees it drawn from the member's public copy (public_libraries, step
// 1.2), so a visitor's page never touches anyone's private library.
const EMPTY: LibraryArchive = { version: 12, exported: "", device: "", shows: [], movies: [], watched: [] };

export async function realProfile(username: string): Promise<PublicProfileView | null> {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_path, banner_path, location, quote, is_private, show_activity, show_watchlog, show_watchlist, show_watching, allow_follows, category_privacy")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!p?.username) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = {
    username: p.username,
    displayName: p.display_name || p.username,
    avatar: image.poster(p.avatar_path, "w342"),
    banner: image.backdrop(p.banner_path),
    bio: p.quote,
    location: p.location,
  };
  if (user && user.id === p.user_id) {
    const { data: row } = await supabase.from("libraries").select("archive").eq("user_id", user.id).maybeSingle();
    const archive = row && isArchive(row.archive) ? row.archive : EMPTY;
    const view = profileFromArchive(archive, meta, true);
    return { ...(await withAiredEpisodes(await withUpToDate(view, archive))), isPrivate: p.is_private, categoryPrivacy: (p.category_privacy as Record<string, boolean>) ?? {} };
  }
  // Everyone else: their public copy, drawn by the same code as the owner's
  // view. None for a private profile (the page shows the private notice), or
  // across a block.
  const { data: pub } = await supabase.from("public_libraries").select("archive").eq("user_id", p.user_id).maybeSingle();
  const archive = pub && isArchive(pub.archive) ? pub.archive : EMPTY;
  const drawn = profileFromArchive(archive, meta, false);
  const view = archive === EMPTY ? drawn : await withAiredEpisodes(await withUpToDate(drawn, archive));
  // What the owner has switched off (Settings → Privacy, and each category's
  // eye) isn't shown. Hidden lists and, with both of these off, watch dates
  // aren't even in the public copy.
  const hiddenCategories = (p.category_privacy as Record<string, boolean>) ?? {};
  return {
    ...view,
    categories: view.categories.filter((c) => !hiddenCategories[c.id]),
    isPrivate: p.is_private,
    hiddenSections: [!p.show_activity && "activity", !p.show_watchlog && "watchlog", !p.show_watchlist && "watchlist", !p.show_watching && "watching"].filter((x): x is string => !!x),
    allowFollows: p.allow_follows,
  };
}
