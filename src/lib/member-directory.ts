"use server";

import { accountsOpen } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";
import { image } from "@/lib/tmdb";

// One member as the Members page and search show them.
export interface Member {
  username: string;
  displayName: string;
  location: string;
  bio: string;
  followers: number;
  following: number;
  reviews: number;
  films: number;
  shows: number;
  /** Days since they joined. */
  joined: number;
  /** Reviews liked this week, for "popular this week". */
  likesThisWeek: number;
  /** Their photo, whether the reader follows them, and whether the profile
      is private (found by search only). */
  avatar?: string | null;
  follow?: "none" | "pending" | "following" | "self";
  isPrivate?: boolean;
  /** Their three highest-rated films and shows, best first, as poster
      pictures: the hand of cards fanned behind their picture. */
  favourites?: string[];
}

// Real members for the Members page, through public.member_directory
// (supabase/migrations/20260930090000_members.sql), which runs with the
// reader's own permissions; and a search by name that also finds private
// members (their card only). Null before accounts open.

const DAY = 86_400_000;

type Row = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_path: string | null;
  location: string | null;
  quote: string | null;
  joined: string;
  followers: number;
  following: number;
  reviews: number;
  titles: number;
  likes_this_week: number;
  my_follow: string | null;
};

export async function memberDirectory(): Promise<Member[] | null> {
  if (!accountsOpen) return null;
  const supabase = await createClient();
  const [{ data }, { data: auth }] = await Promise.all([supabase.rpc("member_directory", { max_rows: 500 }), supabase.auth.getUser()]);
  const me = auth.user?.id;
  const rows = (data ?? []) as Row[];
  // Each member's favourites: their best-rated films and shows from the
  // public projection, three each, in one read for the whole page.
  const favourites = new Map<string, string[]>();
  if (rows.length) {
    const { data: rated } = await supabase
      .from("public_entries")
      .select("user_id, poster_path")
      .in("user_id", rows.map((r) => r.user_id))
      .in("kind", ["movie", "show"])
      .not("rating", "is", null)
      .not("poster_path", "is", null)
      .order("rating", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(2000);
    for (const e of rated ?? []) {
      const list = favourites.get(e.user_id) ?? [];
      const url = image.poster(e.poster_path, "w342");
      if (list.length < 3 && url) favourites.set(e.user_id, [...list, url]);
    }
  }
  return rows.map((r) => ({
    username: r.username,
    displayName: r.display_name || r.username,
    location: r.location ?? "",
    bio: r.quote ?? "",
    followers: Number(r.followers),
    following: Number(r.following),
    reviews: Number(r.reviews),
    films: Number(r.titles),
    shows: 0,
    joined: Math.max(0, Math.floor((Date.now() - Date.parse(r.joined)) / DAY)),
    likesThisWeek: Number(r.likes_this_week),
    avatar: image.poster(r.avatar_path, "w342"),
    follow: r.user_id === me ? "self" : r.my_follow === "accepted" ? "following" : r.my_follow === "pending" ? "pending" : "none",
    favourites: favourites.get(r.user_id) ?? [],
  }));
}

/** Members whose username or name contains the words, public or private. */
export async function searchMembers(query: string): Promise<Member[] | null> {
  if (!accountsOpen) return null;
  const q = query.trim().toLowerCase().replace(/[%_,()]/g, "").slice(0, 40);
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("user_id, username, display_name, avatar_path, location, is_private, created_at").not("username", "is", null).or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(30);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ids = (data ?? []).map((p) => p.user_id);
  const { data: mine } = user && ids.length ? await supabase.from("follows").select("followee, status").eq("follower", user.id).in("followee", ids) : { data: [] };
  const state = new Map((mine ?? []).map((f) => [f.followee, f.status]));
  return (data ?? []).map((p) => ({
    username: p.username!,
    displayName: p.display_name || p.username!,
    location: p.location ?? "",
    bio: "",
    followers: 0,
    following: 0,
    reviews: 0,
    films: 0,
    shows: 0,
    joined: Math.max(0, Math.floor((Date.now() - Date.parse(p.created_at)) / DAY)),
    likesThisWeek: 0,
    avatar: image.poster(p.avatar_path, "w342"),
    isPrivate: p.is_private,
    follow: p.user_id === user?.id ? "self" : state.get(p.user_id) === "accepted" ? "following" : state.get(p.user_id) === "pending" ? "pending" : "none",
  }));
}
