import "server-only";
import { accountsOpen } from "@/lib/accounts";
import type { ListView } from "@/lib/lists";
import type { ProfileTitle, ReviewEntry } from "@/lib/public-profile";
import { createClient } from "@/lib/supabase/server";
import { image } from "@/lib/tmdb";

// Reading other members' public side: the projection tables filled from
// their libraries (supabase/migrations/20260930040000_public_projection.sql).
// The database decides what each reader may see: nothing from private,
// suspended or username-less accounts, and nothing across a block.

interface Who {
  username: string;
  displayName: string;
  avatar: string | null;
}

/** Usernames, names and photos for a set of members. */
async function members(ids: string[]): Promise<Map<string, Who>> {
  if (!ids.length) return new Map();
  const { data } = await (await createClient()).from("profiles").select("user_id, username, display_name, avatar_path").in("user_id", [...new Set(ids)]);
  return new Map(
    (data ?? [])
      .filter((p) => p.username)
      .map((p) => [p.user_id, { username: p.username!, displayName: p.display_name || p.username!, avatar: image.poster(p.avatar_path, "w342") }]),
  );
}

function titleOf(kind: "show" | "movie", id: number, t: { title: string; poster_path: string | null; backdrop_path: string | null; year: string | null }): ProfileTitle {
  return { key: `${kind[0]}${id}`, kind, title: t.title, href: `/${kind}/${id}`, poster: image.poster(t.poster_path, "w780"), backdrop: image.backdrop(t.backdrop_path), year: t.year ?? "" };
}

/** Members' written reviews of a film or series, newest first. */
export async function publicReviewsOfTitle(kind: "movie" | "show", id: number): Promise<{ review: ReviewEntry; username: string; avatar: string | null }[]> {
  if (!accountsOpen) return [];
  const { data } = await (await createClient())
    .from("public_entries")
    .select("user_id, title, poster_path, backdrop_path, year, rating, reaction, review, spoilers, watched_on, rewatch, updated_at")
    .eq("kind", kind)
    .eq("tmdb_id", id)
    .not("review", "is", null)
    .order("updated_at", { ascending: false })
    .limit(50);
  const who = await members((data ?? []).map((r) => r.user_id));
  return (data ?? []).flatMap((r) => {
    const w = who.get(r.user_id);
    if (!w || !r.review) return [];
    const review: ReviewEntry = {
      ...titleOf(kind, id, r),
      text: r.review,
      date: r.watched_on ?? r.updated_at.slice(0, 10),
      rating: r.rating == null ? null : Number(r.rating),
      spoilers: r.spoilers,
      rewatch: r.rewatch,
      loved: r.reaction === "loved",
    };
    return [{ review, username: w.username, avatar: w.avatar }];
  });
}

type ListRow = { user_id: string; id: string; name: string; detail: string | null; titles: { kind: "show" | "movie"; id: number; title: string; poster_path: string | null; backdrop_path: string | null; year: string | null }[] };

function toList(r: ListRow, w: Who): ListView {
  return {
    owner: w.username,
    ownerName: w.displayName,
    id: r.id,
    name: r.name,
    detail: r.detail,
    titles: (r.titles ?? []).map((t) => titleOf(t.kind, t.id, t)),
    // Counted by the callers from the likes table.
    likes: 0,
  };
}

/** Members' lists with something in them, most recently changed first. */
export async function publicLists(limit = 120): Promise<ListView[]> {
  if (!accountsOpen) return [];
  const { data } = await (await createClient()).from("public_lists").select("user_id, id, name, detail, titles").neq("titles", "[]").order("updated_at", { ascending: false }).limit(limit);
  const rows = (data ?? []) as ListRow[];
  const owners = [...new Set(rows.map((r) => r.user_id))];
  const [who, likes] = await Promise.all([
    members(owners),
    owners.length ? (await createClient()).from("likes").select("owner, target, created_at").eq("kind", "list").in("owner", owners).limit(5000) : Promise.resolve({ data: [] }),
  ]);
  // Each list's likes, all told and in the last seven days.
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const total = new Map<string, number>();
  const week = new Map<string, number>();
  for (const l of likes.data ?? []) {
    const k = `${l.owner}/${l.target}`;
    total.set(k, (total.get(k) ?? 0) + 1);
    if (l.created_at > weekAgo) week.set(k, (week.get(k) ?? 0) + 1);
  }
  return rows.flatMap((r) => {
    const w = who.get(r.user_id);
    if (!w) return [];
    const k = `${r.user_id}/${r.id}`;
    return [{ ...toList(r, w), likes: total.get(k) ?? 0, likesWeek: week.get(k) ?? 0 }];
  });
}

/** One member's list, by their username and the list's id. */
export async function publicList(username: string, id: string): Promise<ListView | null> {
  if (!accountsOpen) return null;
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("user_id").eq("username", username.toLowerCase()).maybeSingle();
  if (!p) return null;
  const { data } = await supabase.from("public_lists").select("user_id, id, name, detail, titles").eq("user_id", p.user_id).eq("id", id).maybeSingle();
  if (!data) return null;
  const who = await members([p.user_id]);
  const w = who.get(p.user_id);
  return w ? toList(data as ListRow, w) : null;
}

/** Members' written reviews whose title or words match, newest first (search). */
export async function searchReviews(query: string): Promise<{ review: ReviewEntry; username: string; avatar: string | null }[]> {
  if (!accountsOpen) return [];
  const q = query.trim().replace(/[%_,()]/g, "").slice(0, 60);
  if (q.length < 2) return [];
  const { data } = await (await createClient())
    .from("public_entries")
    .select("user_id, kind, tmdb_id, title, poster_path, backdrop_path, year, rating, reaction, review, spoilers, watched_on, rewatch, updated_at")
    .not("review", "is", null)
    .neq("kind", "episode")
    .or(`title.ilike.%${q}%,review.ilike.%${q}%`)
    .order("updated_at", { ascending: false })
    .limit(40);
  const who = await members((data ?? []).map((r) => r.user_id));
  return (data ?? []).flatMap((r) => {
    const w = who.get(r.user_id);
    if (!w || !r.review) return [];
    const kind = r.kind as "movie" | "show";
    return [
      {
        review: { ...titleOf(kind, r.tmdb_id, r), text: r.review, date: r.watched_on ?? r.updated_at.slice(0, 10), rating: r.rating == null ? null : Number(r.rating), spoilers: r.spoilers, rewatch: r.rewatch, loved: r.reaction === "loved" },
        username: w.username,
        avatar: w.avatar,
      },
    ];
  });
}

export interface TitleRatings {
  /** Out of 10, one decimal; null when nobody has rated it. */
  average: number | null;
  count: number;
  loved: number;
  /** How many ratings fell in each of 1–10. */
  spread: number[];
  /** The people the reader follows who rated or loved it. */
  friends: { username: string; avatar: string | null; rating: number | null; loved: boolean; href: string }[];
}

/** Members' ratings of a title, and the reader's friends' (title pages). */
export async function titleRatings(kind: "movie" | "show", id: number): Promise<TitleRatings | null> {
  if (!accountsOpen) return null;
  const supabase = await createClient();
  const [{ data: sum }, { data: auth }] = await Promise.all([supabase.rpc("title_ratings", { p_kind: kind, p_id: id }), supabase.auth.getUser()]);
  const row = (sum as { average: number | null; ratings: number; loved: number; spread: number[] }[] | null)?.[0];
  const friends: TitleRatings["friends"] = [];
  const me = auth.user?.id;
  if (me) {
    const { data: f } = await supabase.from("follows").select("followee").eq("follower", me).eq("status", "accepted").limit(1000);
    const ids = (f ?? []).map((x) => x.followee);
    if (ids.length) {
      const { data: rated } = await supabase.from("public_entries").select("user_id, rating, reaction, review").eq("kind", kind).eq("tmdb_id", id).in("user_id", ids).limit(200);
      const who = await members((rated ?? []).map((r) => r.user_id));
      for (const r of rated ?? []) {
        const w = who.get(r.user_id);
        if (!w || (r.rating == null && r.reaction !== "loved")) continue;
        friends.push({ username: w.username, avatar: w.avatar, rating: r.rating == null ? null : Number(r.rating), loved: r.reaction === "loved", href: r.review ? `/u/${w.username}/review/${kind === "movie" ? "m" : "s"}${id}` : `/u/${w.username}` });
      }
      friends.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
  }
  if (!row?.ratings && !row?.loved && !friends.length) return null;
  return { average: row?.average == null ? null : Number(row.average), count: row?.ratings ?? 0, loved: row?.loved ?? 0, spread: row?.spread ?? Array(10).fill(0), friends };
}
