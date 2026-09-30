"use server";

import { revalidatePath } from "next/cache";
import { checkName } from "@/lib/word-filter";
import { createClient } from "@/lib/supabase/server";

// Only TMDB paths are accepted for the banner and avatar — "/abc123.jpg" —
// so the page can never be pointed at an arbitrary image host.
const PATH = /^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/;

export async function saveProfile(input: { display_name?: string | null; banner_path?: string | null; avatar_path?: string | null; banner_focus?: number }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  // The word filter again here, where it can't be skipped.
  const nameProblem = input.display_name ? checkName(input.display_name) : null;
  if (nameProblem) return { error: nameProblem };

  const row: Record<string, string | number | null> = {};
  if ("display_name" in input) row.display_name = (input.display_name ?? "").trim().slice(0, 40) || null;
  if ("banner_path" in input) row.banner_path = input.banner_path && PATH.test(input.banner_path) ? input.banner_path : null;
  if ("avatar_path" in input) row.avatar_path = input.avatar_path && PATH.test(input.avatar_path) ? input.avatar_path : null;
  // Clamped rather than rejected: the slider can only produce 0–100, and a
  // value outside it means something else sent it.
  if ("banner_focus" in input) row.banner_focus = Math.max(0, Math.min(100, Math.round(input.banner_focus ?? 40)));

  const { error } = await supabase.from("profiles").upsert({ user_id: user.id, ...row });
  if (error) return { error: error.message };
  revalidatePath("/u", "layout");
  return {};
}

/** Pins a review to the top of the owner's profile, or unpins it; three at most. */
export async function setPinnedReview(key: string, on: boolean): Promise<{ error?: string }> {
  if (!/^[mse][0-9-]{1,30}$/.test(key)) return { error: "That isn't a review." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const { data } = await supabase.from("profiles").select("pinned_reviews, username").eq("user_id", user.id).maybeSingle();
  const now = ((data?.pinned_reviews as string[] | null) ?? []).filter((k) => k !== key);
  if (on && now.length >= 3) return { error: "You can pin three reviews. Unpin one first." };
  const { error } = await supabase.from("profiles").update({ pinned_reviews: on ? [...now, key] : now }).eq("user_id", user.id);
  if (error) return { error: "That didn't save. Try again." };
  if (data?.username) revalidatePath(`/u/${data.username}`);
  return {};
}
