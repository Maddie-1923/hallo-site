"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { accountsOpen } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";
import { image } from "@/lib/tmdb";
import { checkText } from "@/lib/word-filter";

// The social side from the site (docs/social-plan.md, step 4): following,
// likes and comments on reviews and lists, follower lists, notifications
// and the feed. The database decides what's allowed
// (supabase/migrations/20260930080000_social_graph.sql): blocks, private
// profiles, follows switched off, things that don't exist. Before accounts
// open every action answers { ok: false, preview: true } and the pages keep
// their preview behaviour.

export type FollowState = "none" | "pending" | "following" | "self";
export type TargetKind = "review" | "list";
export interface Person {
  username: string;
  displayName: string;
  avatar: string | null;
}
export interface CommentView {
  id: string;
  author: Person;
  body: string;
  at: string;
  mine: boolean;
  /** The review's or list's owner may delete any comment on it. */
  canDelete: boolean;
}

async function me() {
  if (!accountsOpen) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function admin() {
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!key) return null;
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type Client = NonNullable<Awaited<ReturnType<typeof me>>>["supabase"];

/** A member's account id from their username, if the reader may see them. */
async function idOf(supabase: Client, username: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("user_id").eq("username", username.toLowerCase()).maybeSingle();
  return data?.user_id ?? null;
}

async function people(supabase: Client, ids: string[]): Promise<Map<string, Person>> {
  if (!ids.length) return new Map();
  const { data } = await supabase.from("profiles").select("user_id, username, display_name, avatar_path").in("user_id", [...new Set(ids)]);
  return new Map((data ?? []).filter((p) => p.username).map((p) => [p.user_id, { username: p.username!, displayName: p.display_name || p.username!, avatar: image.poster(p.avatar_path, "w342") }]));
}

const refused = (e: { message?: string } | null) =>
  e?.message?.includes("not taking follows") ? "They aren't taking follows." : e?.message?.includes("blocked") ? "You can't follow this member." : "That didn't work. Try again.";

// ---- Follows ----

export async function followState(username: string): Promise<{ state: FollowState; followers: number; following: number } | null> {
  const m = await me();
  if (!m) return null;
  const id = await idOf(m.supabase, username);
  if (!id) return null;
  const [mine, followers, following] = await Promise.all([
    m.user ? m.supabase.from("follows").select("status").eq("follower", m.user.id).eq("followee", id).maybeSingle() : Promise.resolve({ data: null }),
    m.supabase.from("follows").select("follower", { count: "exact", head: true }).eq("followee", id).eq("status", "accepted"),
    m.supabase.from("follows").select("followee", { count: "exact", head: true }).eq("follower", id).eq("status", "accepted"),
  ]);
  const state: FollowState = m.user?.id === id ? "self" : mine.data ? (mine.data.status === "pending" ? "pending" : "following") : "none";
  return { state, followers: followers.count ?? 0, following: following.count ?? 0 };
}

/** Follow (or ask to, for a private profile) or stop following / withdraw the request. */
export async function setFollow(username: string, on: boolean): Promise<{ ok: boolean; state?: FollowState; error?: string; preview?: boolean }> {
  const m = await me();
  if (!m) return { ok: false, preview: true };
  if (!m.user) return { ok: false, error: "Sign in to follow people." };
  const id = await idOf(m.supabase, username);
  if (!id || id === m.user.id) return { ok: false, error: "That member can't be followed." };
  if (on) {
    const { error } = await m.supabase.from("follows").insert({ follower: m.user.id, followee: id });
    if (error && error.code !== "23505") return { ok: false, error: refused(error) };
  } else {
    const { error } = await m.supabase.from("follows").delete().eq("follower", m.user.id).eq("followee", id);
    if (error) return { ok: false, error: refused(error) };
  }
  revalidatePath(`/u/${username}`);
  return { ok: true, state: (await followState(username))?.state };
}

/** On your own profile: accept a request, or decline / remove a follower. */
export async function answerFollower(username: string, accept: boolean): Promise<{ ok: boolean; error?: string; preview?: boolean }> {
  const m = await me();
  if (!m) return { ok: false, preview: true };
  if (!m.user) return { ok: false, error: "Sign in first." };
  const id = await idOf(m.supabase, username);
  if (!id) return { ok: false, error: "That member isn't there any more." };
  const q = accept
    ? m.supabase.from("follows").update({ status: "accepted" }).eq("follower", id).eq("followee", m.user.id).eq("status", "pending")
    : m.supabase.from("follows").delete().eq("follower", id).eq("followee", m.user.id);
  const { error } = await q;
  return error ? { ok: false, error: "That didn't work. Try again." } : { ok: true };
}

/** A profile's followers or who they follow; the owner also gets their requests. */
export async function followList(username: string, which: "followers" | "following"): Promise<{ people: Person[]; requests: Person[] } | null> {
  const m = await me();
  if (!m) return null;
  const id = await idOf(m.supabase, username);
  if (!id) return { people: [], requests: [] };
  const col = which === "followers" ? "followee" : "follower";
  const other = which === "followers" ? "follower" : "followee";
  const { data } = await m.supabase.from("follows").select("follower, followee, status").eq(col, id).order("created_at", { ascending: false }).limit(500);
  const rows = data ?? [];
  const who = await people(m.supabase, rows.map((r) => r[other as "follower" | "followee"]));
  const pick = (status: string) => rows.filter((r) => r.status === status).flatMap((r) => (who.get(r[other as "follower" | "followee"]) ? [who.get(r[other as "follower" | "followee"])!] : []));
  return { people: pick("accepted"), requests: which === "followers" && m.user?.id === id ? pick("pending") : [] };
}

// ---- Likes ----

/** A review's or list's likes and comments, and whether the reader liked it. */
export async function likeInfo(kind: TargetKind, owner: string, target: string): Promise<{ count: number; liked: boolean; comments: number } | null> {
  const m = await me();
  if (!m) return null;
  const id = await idOf(m.supabase, owner);
  if (!id) return null;
  const [count, mine, comments] = await Promise.all([
    m.supabase.from("likes").select("user_id", { count: "exact", head: true }).eq("kind", kind).eq("owner", id).eq("target", target),
    m.user ? m.supabase.from("likes").select("user_id").eq("kind", kind).eq("owner", id).eq("target", target).eq("user_id", m.user.id).maybeSingle() : Promise.resolve({ data: null }),
    m.supabase.from("comments").select("id", { count: "exact", head: true }).eq("kind", kind).eq("owner", id).eq("target", target),
  ]);
  return { count: count.count ?? 0, liked: !!mine.data, comments: comments.count ?? 0 };
}

/**
 * likeInfo for many at once: everything on a page asks together (lib/
 * like-batch.ts), so fifty reviews cost one request and three queries rather
 * than fifty and two hundred. Same answers, in the order asked.
 */
export async function likeInfoMany(items: { kind: TargetKind; owner: string; target: string }[]): Promise<({ count: number; liked: boolean; comments: number } | null)[]> {
  const m = await me();
  if (!m || !items.length) return items.map(() => null);
  const list = items.slice(0, 200);
  const names = [...new Set(list.map((i) => i.owner.toLowerCase()))];
  const { data: people } = await m.supabase.from("profiles").select("user_id, username").in("username", names);
  const idOfName = new Map((people ?? []).map((p) => [p.username as string, p.user_id as string]));
  const ids = [...new Set([...idOfName.values()])];
  const targets = [...new Set(list.map((i) => i.target))];
  if (!ids.length) return items.map(() => null);
  const [likes, comments] = await Promise.all([
    m.supabase.from("likes").select("kind, owner, target, user_id").in("owner", ids).in("target", targets).limit(20000),
    m.supabase.from("comments").select("kind, owner, target").in("owner", ids).in("target", targets).limit(20000),
  ]);
  const key = (kind: string, owner: string, target: string) => `${kind}|${owner}|${target}`;
  const count = new Map<string, number>();
  const mine = new Set<string>();
  for (const l of likes.data ?? []) {
    const k = key(l.kind, l.owner, l.target);
    count.set(k, (count.get(k) ?? 0) + 1);
    if (m.user && l.user_id === m.user.id) mine.add(k);
  }
  const said = new Map<string, number>();
  for (const c of comments.data ?? []) said.set(key(c.kind, c.owner, c.target), (said.get(key(c.kind, c.owner, c.target)) ?? 0) + 1);
  return items.map((i, n) => {
    const id = n < list.length ? idOfName.get(i.owner.toLowerCase()) : undefined;
    if (!id) return null;
    const k = key(i.kind, id, i.target);
    return { count: count.get(k) ?? 0, liked: mine.has(k), comments: said.get(k) ?? 0 };
  });
}

export async function setLike(kind: TargetKind, owner: string, target: string, on: boolean): Promise<{ ok: boolean; error?: string; preview?: boolean }> {
  const m = await me();
  if (!m) return { ok: false, preview: true };
  if (!m.user) return { ok: false, error: "Sign in to like things." };
  const id = await idOf(m.supabase, owner);
  if (!id) return { ok: false, error: "That isn't there any more." };
  const { error } = on
    ? await m.supabase.from("likes").insert({ user_id: m.user.id, kind, owner: id, target })
    : await m.supabase.from("likes").delete().eq("user_id", m.user.id).eq("kind", kind).eq("owner", id).eq("target", target);
  if (error && error.code !== "23505") return { ok: false, error: "That didn't work. Try again." };
  return { ok: true };
}

// ---- Comments ----

export async function loadComments(kind: TargetKind, owner: string, target: string): Promise<CommentView[] | null> {
  const m = await me();
  if (!m) return null;
  const id = await idOf(m.supabase, owner);
  if (!id) return [];
  const { data } = await m.supabase.from("comments").select("id, author, body, created_at").eq("kind", kind).eq("owner", id).eq("target", target).order("created_at").limit(500);
  const who = await people(m.supabase, (data ?? []).map((c) => c.author));
  return (data ?? []).flatMap((c) =>
    who.get(c.author) ? [{ id: c.id, author: who.get(c.author)!, body: c.body, at: c.created_at, mine: c.author === m.user?.id, canDelete: c.author === m.user?.id || id === m.user?.id }] : [],
  );
}

export async function postComment(kind: TargetKind, owner: string, target: string, body: string): Promise<{ ok: boolean; comment?: CommentView; error?: string; preview?: boolean }> {
  const m = await me();
  if (!m) return { ok: false, preview: true };
  if (!m.user) return { ok: false, error: "Sign in to comment." };
  const text = body.trim().slice(0, 1000);
  if (!text) return { ok: false, error: "Write something first." };
  const problem = checkText(text);
  if (problem) return { ok: false, error: problem };
  const id = await idOf(m.supabase, owner);
  if (!id) return { ok: false, error: "That isn't there any more." };
  // Only on something this person can see: read it as them, so blocks and
  // private profiles decide.
  const seen =
    kind === "review"
      ? await m.supabase.from("public_entries").select("key").eq("user_id", id).eq("key", `${target[0] === "m" ? "movie" : "show"}:${target.slice(1)}`).not("review", "is", null).maybeSingle()
      : await m.supabase.from("public_lists").select("id").eq("user_id", id).eq("id", target).maybeSingle();
  if (!seen.data) return { ok: false, error: "You can't comment on this." };
  const db = admin();
  if (!db) return { ok: false, error: "Comments can't be posted right now." };
  // A brake on floods: 30 an hour.
  const { count } = await db.from("comments").select("id", { count: "exact", head: true }).eq("author", m.user.id).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= 30) return { ok: false, error: "That's a lot of comments in an hour. Take a break and try again later." };
  const { data, error } = await db.from("comments").insert({ author: m.user.id, kind, owner: id, target, body: text }).select("id, created_at").single();
  if (error || !data) return { ok: false, error: "That didn't post. Try again." };
  const who = await people(m.supabase, [m.user.id]);
  return { ok: true, comment: { id: data.id, author: who.get(m.user.id) ?? { username: "you", displayName: "You", avatar: null }, body: text, at: data.created_at, mine: true, canDelete: true } };
}

export async function deleteComment(commentID: string): Promise<{ ok: boolean }> {
  const m = await me();
  if (!m?.user) return { ok: false };
  const { error } = await m.supabase.from("comments").delete().eq("id", commentID);
  return { ok: !error };
}

// ---- Notifications ----

export interface NotificationView {
  id: string;
  kind: "follow" | "follow_request" | "follow_accepted" | "like" | "comment";
  who: Person;
  at: string;
  read: boolean;
  href: string;
  about: string | null;
  /** The review's title or the list's name, with its picture. */
  subject: { title: string; poster: string | null } | null;
  text: string | null;
}

export async function loadNotifications(): Promise<NotificationView[] | null> {
  const m = await me();
  if (!m?.user) return null;
  const { data } = await m.supabase.from("notifications").select("id, actor, kind, target_kind, target, comment_id, created_at, read_at").order("created_at", { ascending: false }).limit(100);
  const rows = data ?? [];
  const who = await people(m.supabase, rows.map((r) => r.actor));
  const mine = await people(m.supabase, [m.user.id]);
  const self = mine.get(m.user.id)?.username ?? "";
  const commentIDs = rows.flatMap((r) => (r.comment_id ? [r.comment_id] : []));
  const bodies = new Map<string, string>();
  if (commentIDs.length) {
    const { data: cs } = await m.supabase.from("comments").select("id, body").in("id", commentIDs);
    for (const c of cs ?? []) bodies.set(c.id, c.body);
  }
  // The reviews' and lists' own titles and posters, from the reader's copy.
  const [entries, lists] = await Promise.all([
    rows.some((r) => r.target_kind === "review") ? m.supabase.from("public_entries").select("kind, tmdb_id, title, poster_path").eq("user_id", m.user.id).not("review", "is", null) : Promise.resolve({ data: [] }),
    rows.some((r) => r.target_kind === "list") ? m.supabase.from("public_lists").select("id, name, titles").eq("user_id", m.user.id) : Promise.resolve({ data: [] }),
  ]);
  const titleOf = (kind: string | null, target: string | null): NotificationView["subject"] => {
    if (kind === "review") {
      const e = (entries.data ?? []).find((x) => `${x.kind === "movie" ? "m" : "s"}${x.tmdb_id}` === target);
      return e ? { title: e.title, poster: image.poster(e.poster_path, "w342") } : null;
    }
    if (kind === "list") {
      const l = (lists.data ?? []).find((x) => x.id === target);
      const first = (l?.titles as { poster_path: string | null }[] | undefined)?.[0];
      return l ? { title: l.name, poster: image.poster(first?.poster_path ?? null, "w342") } : null;
    }
    return null;
  };
  return rows.flatMap((r) => {
    const w = who.get(r.actor);
    if (!w) return [];
    const href = r.target_kind === "review" ? `/u/${self}/review/${r.target}` : r.target_kind === "list" ? `/u/${self}/list/${r.target}` : `/u/${w.username}`;
    return [{ id: r.id, kind: r.kind, who: w, at: r.created_at, read: !!r.read_at, href, about: r.target_kind === "review" ? "your review" : r.target_kind === "list" ? "your list" : null, subject: titleOf(r.target_kind, r.target), text: r.comment_id ? (bodies.get(r.comment_id) ?? null) : null }];
  });
}

export async function markNotificationsRead(): Promise<void> {
  const m = await me();
  if (!m?.user) return;
  await m.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient", m.user.id).is("read_at", null);
}

// ---- Blocks ----

/** Blocks or unblocks a member on the account (the browser keeps its own copy too). */
export async function setBlockedOnAccount(username: string, on: boolean): Promise<{ ok: boolean; preview?: boolean }> {
  const m = await me();
  if (!m) return { ok: false, preview: true };
  if (!m.user) return { ok: false };
  const id = await idOf(m.supabase, username);
  if (!id || id === m.user.id) return { ok: false };
  const { error } = on
    ? await m.supabase.from("blocks").insert({ blocker: m.user.id, blocked: id })
    : await m.supabase.from("blocks").delete().eq("blocker", m.user.id).eq("blocked", id);
  return { ok: !error || error.code === "23505" };
}

// ---- The feed ----

export interface FeedItem {
  key: string;
  who: Person;
  at: string;
  kind: "review" | "rating" | "loved" | "list";
  title: string;
  href: string;
  poster: string | null;
  rating: number | null;
  text: string | null;
  spoilers: boolean;
  /** For a review: its own page, to like and comment. */
  reviewHref?: string;
}

/** What the people you follow rated, loved, reviewed and listed, newest first. */
export async function loadFeed(): Promise<FeedItem[] | null> {
  const m = await me();
  if (!m?.user) return null;
  const { data: f } = await m.supabase.from("follows").select("followee").eq("follower", m.user.id).eq("status", "accepted").limit(1000);
  const ids = (f ?? []).map((x) => x.followee);
  if (!ids.length) return [];
  const [entries, lists, who] = await Promise.all([
    m.supabase.from("public_entries").select("user_id, key, kind, tmdb_id, episode, title, poster_path, rating, reaction, review, spoilers, updated_at").in("user_id", ids).or("kind.neq.episode,review.not.is.null").order("updated_at", { ascending: false }).limit(80),
    m.supabase.from("public_lists").select("user_id, id, name, titles, updated_at").in("user_id", ids).order("updated_at", { ascending: false }).limit(20),
    people(m.supabase, ids),
  ]);
  const items: FeedItem[] = [];
  for (const e of entries.data ?? []) {
    const w = who.get(e.user_id);
    if (!w) continue;
    // An episode's review: its own page, key and label ("S2 E4").
    const ep = e.kind === "episode" && e.episode ? e.episode.split("-") : null;
    const short = ep ? `e${e.tmdb_id}-${ep[0]}-${ep[1]}` : `${e.kind === "movie" ? "m" : "s"}${e.tmdb_id}`;
    items.push({
      key: `${e.user_id}:${e.key}`,
      who: w,
      at: e.updated_at,
      kind: e.review ? "review" : e.rating != null ? "rating" : "loved",
      title: ep ? `${e.title} · S${ep[0]} E${ep[1]}` : e.title,
      href: ep ? `/show/${e.tmdb_id}/season/${ep[0]}/episode/${ep[1]}` : `/${e.kind}/${e.tmdb_id}`,
      poster: image.poster(e.poster_path, "w342"),
      rating: e.rating == null ? null : Number(e.rating),
      text: e.review,
      spoilers: e.spoilers,
      reviewHref: e.review ? `/u/${w.username}/review/${short}` : undefined,
    });
  }
  for (const l of lists.data ?? []) {
    const w = who.get(l.user_id);
    if (!w) continue;
    const first = (l.titles as { poster_path: string | null }[])?.[0];
    items.push({ key: `${l.user_id}:list:${l.id}`, who: w, at: l.updated_at, kind: "list", title: l.name, href: `/u/${w.username}/list/${l.id}`, poster: image.poster(first?.poster_path ?? null, "w342"), rating: null, text: null, spoilers: false });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 80);
}
