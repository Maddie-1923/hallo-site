import "server-only";
import { accountsOpen } from "@/lib/accounts";
import { isArchive, type LibraryArchive } from "@/lib/archive";
import { profileFromArchive, withAiredEpisodes, withUpToDate, type LikedItem, type PublicProfileView } from "@/lib/public-profile";
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

/** A member's profile by username, or null: nobody, or accounts closed. */
export async function loadProfile(username: string): Promise<PublicProfileView | null> {
  return accountsOpen ? realProfile(username) : null;
}

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
  // Followers and following (accepted only), whether the viewer follows
  // them, and what they've liked: the same for the owner and everyone else.
  const [followers, following, mine, liked] = await Promise.all([
    supabase.from("follows").select("follower", { count: "exact", head: true }).eq("followee", p.user_id).eq("status", "accepted"),
    supabase.from("follows").select("followee", { count: "exact", head: true }).eq("follower", p.user_id).eq("status", "accepted"),
    user && user.id !== p.user_id ? supabase.from("follows").select("status").eq("follower", user.id).eq("followee", p.user_id).maybeSingle() : Promise.resolve({ data: null }),
    likedBy(supabase, p.user_id),
  ]);
  // "none" for a signed-out visitor too, so Follow asks them to sign in.
  const viewerFollow = !user ? ("none" as const) : user.id === p.user_id ? ("self" as const) : mine.data ? (mine.data.status === "pending" ? ("pending" as const) : ("following" as const)) : ("none" as const);
  const social = { followers: followers.count ?? 0, following: following.count ?? 0, viewerFollow, liked };

  if (user && user.id === p.user_id) {
    const { data: row } = await supabase.from("libraries").select("archive").eq("user_id", user.id).maybeSingle();
    const archive = row && isArchive(row.archive) ? row.archive : EMPTY;
    const view = profileFromArchive(archive, meta, true);
    return { ...(await withAiredEpisodes(await withUpToDate(view, archive))), ...social, isPrivate: p.is_private, categoryPrivacy: (p.category_privacy as Record<string, boolean>) ?? {} };
  }
  // Everyone else: their public copy, drawn by the same code as the owner's
  // view. None for a private profile unless the viewer is an approved
  // follower (the page shows the private notice), or across a block.
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
    ...social,
    categories: view.categories.filter((c) => !hiddenCategories[c.id]),
    // Private, and the viewer isn't an approved follower: only the card.
    isPrivate: p.is_private && viewerFollow !== "following",
    hiddenSections: [!p.show_activity && "activity", !p.show_watchlog && "watchlog", !p.show_watchlist && "watchlist", !p.show_watching && "watching"].filter((x): x is string => !!x),
    allowFollows: p.allow_follows,
  };
}

type Client = Awaited<ReturnType<typeof createClient>>;

/** The reviews and lists a member has liked that the viewer may see, newest first. */
async function likedBy(supabase: Client, userID: string): Promise<LikedItem[]> {
  const { data: likes } = await supabase.from("likes").select("kind, owner, target, created_at").eq("user_id", userID).order("created_at", { ascending: false }).limit(60);
  const rows = likes ?? [];
  if (!rows.length) return [];
  const owners = [...new Set(rows.map((r) => r.owner))];
  const [profiles, entries, lists] = await Promise.all([
    supabase.from("profiles").select("user_id, username").in("user_id", owners),
    supabase.from("public_entries").select("user_id, key, kind, tmdb_id, title, poster_path").in("user_id", owners).not("review", "is", null),
    supabase.from("public_lists").select("user_id, id, name, titles").in("user_id", owners),
  ]);
  const name = new Map((profiles.data ?? []).map((x) => [x.user_id, x.username as string]));
  return rows.flatMap((r): LikedItem[] => {
    const owner = name.get(r.owner);
    if (!owner) return [];
    if (r.kind === "review") {
      const e = (entries.data ?? []).find((x) => x.user_id === r.owner && `${x.kind === "movie" ? "m" : "s"}${x.tmdb_id}` === r.target);
      return e ? [{ key: `review:${owner}:${r.target}`, kind: "review", title: e.title, poster: image.poster(e.poster_path, "w342"), href: `/u/${owner}/review/${r.target}`, owner }] : [];
    }
    const l = (lists.data ?? []).find((x) => x.user_id === r.owner && x.id === r.target);
    const first = (l?.titles as { poster_path: string | null }[] | undefined)?.[0];
    return l ? [{ key: `list:${owner}:${r.target}`, kind: "list", title: l.name, poster: image.poster(first?.poster_path ?? null, "w342"), href: `/u/${owner}/list/${r.target}`, owner }] : [];
  });
}
