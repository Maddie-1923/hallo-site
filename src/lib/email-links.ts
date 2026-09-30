import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// The unsubscribe link in every notification email, which works without
// signing in: the account's id and a signature only the server can make, so
// nobody can switch off someone else's emails by guessing. Signed with
// EMAIL_LINK_SECRET, or the service role key where that isn't set.

function secret(): string | null {
  return process.env.EMAIL_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

function sign(uid: string): string | null {
  const key = secret();
  return key ? createHmac("sha256", key).update(`unsubscribe:${uid}`).digest("base64url") : null;
}

/** The query string for someone's unsubscribe link: `u=…&t=…`. */
export function unsubscribeQuery(uid: string): string | null {
  const t = sign(uid);
  return t ? `u=${encodeURIComponent(uid)}&t=${t}` : null;
}

export function validUnsubscribe(uid: string | null, token: string | null): uid is string {
  if (!uid || !token || !/^[0-9a-f-]{36}$/i.test(uid)) return false;
  const want = sign(uid);
  if (!want) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The database with the service role: what the emails and the unsubscribe link need. */
export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Every notification email off for this account, as Settings would do it. */
export async function unsubscribeAll(uid: string): Promise<boolean> {
  const db = adminClient();
  if (!db) return false;
  const { data } = await db.from("user_settings").select("settings").eq("user_id", uid).maybeSingle();
  const settings = { ...((data?.settings as Record<string, unknown> | null) ?? {}), notifyFollows: false, notifyLikes: false, notifyComments: false, weeklyDigest: false };
  const { error } = await db.from("user_settings").upsert({ user_id: uid, settings });
  return !error;
}
