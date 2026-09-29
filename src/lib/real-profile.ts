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
// else sees the card (name, photo, banner, place, quote) and, until the
// public tables exist (docs/social-plan.md, step 1.2), nothing under it;
// those tables are what a visitor's reviews, lists and Watchlog will be read
// from, so a visitor's page never touches anyone's private library.
const EMPTY: LibraryArchive = { version: 12, exported: "", device: "", shows: [], movies: [], watched: [] };

export async function realProfile(username: string): Promise<PublicProfileView | null> {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_path, banner_path, location, quote, is_private")
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
    return { ...(await withAiredEpisodes(await withUpToDate(view, archive))), isPrivate: p.is_private };
  }
  return { ...profileFromArchive(EMPTY, meta, false), isPrivate: p.is_private, previewNote: p.is_private ? undefined : "Their reviews, lists and Watchlog show here soon." };
}
