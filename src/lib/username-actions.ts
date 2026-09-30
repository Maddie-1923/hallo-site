"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { accountsOpen } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";
import { checkUsername } from "@/lib/word-filter";

// Choosing a username (/profile/setup). Only the server writes usernames,
// with the service key, after the shape, reserved-name and word checks
// (lib/word-filter.ts); the database refuses one from a browser
// (supabase/migrations/20260930020000_usernames.sql).

function admin() {
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!key) return null;
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Whether a username can be had, for the form as it's typed. */
export async function usernameAvailable(raw: string): Promise<{ ok: boolean; message: string }> {
  const name = raw.trim().toLowerCase();
  const problem = checkUsername(name);
  if (problem) return { ok: false, message: problem };
  const db = admin();
  if (!accountsOpen || !db) return { ok: true, message: "Looks good." };
  const { data: { user } } = await (await createClient()).auth.getUser();
  const { data } = await db.from("profiles").select("user_id").eq("username", name).maybeSingle();
  if (data && data.user_id !== user?.id) return { ok: false, message: "Taken. Try another." };
  return { ok: true, message: data ? "That's your username now." : "Available" };
}

/** Takes the username and the public/private choice for the signed-in person. */
export async function claimUsername(raw: string, isPrivate: boolean): Promise<{ ok: true; username: string } | { ok: false; message: string }> {
  const name = raw.trim().toLowerCase();
  const problem = checkUsername(name);
  if (problem) return { ok: false, message: problem };
  if (!accountsOpen) return { ok: false, message: "Usernames open with accounts." };
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return { ok: false, message: "Sign in first." };
  const db = admin();
  if (!db) return { ok: false, message: "Usernames can't be saved right now. Try again later." };
  const { error } = await db.from("profiles").upsert({ user_id: user.id, username: name, is_private: isPrivate }, { onConflict: "user_id" });
  if (error?.code === "23505") return { ok: false, message: "That username is taken." };
  if (error) return { ok: false, message: "That didn't save. Try again." };
  return { ok: true, username: name };
}
