import "server-only";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { checkText } from "@/lib/word-filter";

// Writing one comment, shared by the site's postComment and the app's
// /api/app/comments, so both go through the same door: the word filter, a
// check that the writer can see what they're replying to (read as them, so
// blocks and private profiles decide), the review's replies switch, and 30
// an hour. Only then does the service key write it — comments are closed to
// every other writer (supabase/migrations/20260930080000_social_graph.sql),
// and the database refuses one on a review with replies off whatever wrote it.

export type CommentKind = "review" | "list";

/** A review's public key from its address: m123 → movie:123, s123 →
    show:123, e123-2-4 → episode:123-2-4. */
export function reviewKey(target: string): string | null {
  const kind = { m: "movie", s: "show", e: "episode" }[target[0] as "m" | "s" | "e"];
  return kind ? `${kind}:${target.slice(1)}` : null;
}

function admin() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function writeComment(
  reader: SupabaseClient,
  userID: string,
  kind: CommentKind,
  ownerID: string,
  target: string,
  body: string,
): Promise<{ ok: true; id: string; at: string; text: string } | { ok: false; error: string }> {
  const text = body.trim().slice(0, 1000);
  if (!text) return { ok: false, error: "Write something first." };
  const problem = checkText(text);
  if (problem) return { ok: false, error: problem };
  const key = kind === "review" ? reviewKey(target) : null;
  if (kind === "review" && !key) return { ok: false, error: "You can't comment on this." };
  const seen =
    kind === "review"
      ? await reader.from("public_entries").select("key").eq("user_id", ownerID).eq("key", key!).not("review", "is", null).maybeSingle()
      : await reader.from("public_lists").select("id").eq("user_id", ownerID).eq("id", target).maybeSingle();
  if (!seen.data) return { ok: false, error: "You can't comment on this." };
  // Turned off by the writer. The database refuses the insert as well; this
  // is the check that gets a sentence back to the person instead of a failure.
  if (kind === "review") {
    const closed = await reader.rpc("review_replies_closed", { p_owner: ownerID, p_target: target });
    if (closed.data === true) return { ok: false, error: "Replies are off for this review." };
  }
  const db = admin();
  if (!db) return { ok: false, error: "Comments can't be posted right now." };
  // A brake on floods: 30 an hour.
  const { count } = await db.from("comments").select("id", { count: "exact", head: true }).eq("author", userID).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= 30) return { ok: false, error: "That's a lot of comments in an hour. Take a break and try again later." };
  const { data, error } = await db.from("comments").insert({ author: userID, kind, owner: ownerID, target, body: text }).select("id, created_at").single();
  if (error || !data) return { ok: false, error: "That didn't post. Try again." };
  return { ok: true, id: data.id, at: data.created_at, text };
}
