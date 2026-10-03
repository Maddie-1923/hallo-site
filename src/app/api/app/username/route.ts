import { createClient, createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { accountsOpen } from "@/lib/accounts";
import { checkUsername } from "@/lib/word-filter";

// Usernames from the iPhone app. The database takes a username from the
// service key alone (supabase/migrations/20260930020000_usernames.sql), and
// /profile/setup's claimUsername runs the shape, reserved-name and word checks
// first; this is the same door for a caller with a bearer token instead of a
// site cookie, so a name chosen in the app passes the checks one chosen here
// does.
//
// GET  ?name=<wanted>  → 200 { ok, message }        as-you-type availability
// POST { username }    → 200 { username } | 4xx/503 { error }
//
// A POST leaves is_private as it is on a profile that already exists, and
// makes a new one public — the default the app and the site both ship with.

function admin() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function member(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const reader = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
  } = await reader.auth.getUser(token);
  return user;
}

export async function GET(request: Request) {
  const name = (new URL(request.url).searchParams.get("name") ?? "").trim().toLowerCase();
  const problem = checkUsername(name);
  if (problem) return NextResponse.json({ ok: false, message: problem });
  const db = admin();
  if (!accountsOpen || !db) return NextResponse.json({ ok: false, message: "Usernames open with accounts." });
  const user = await member(request);
  const { data } = await db.from("profiles").select("user_id").eq("username", name).maybeSingle();
  if (data && data.user_id !== user?.id) return NextResponse.json({ ok: false, message: "That one's taken. Try another." });
  return NextResponse.json({ ok: true, message: data ? "That's your username now." : "Available" });
}

export async function POST(request: Request) {
  if (!accountsOpen) return NextResponse.json({ error: "Usernames open with accounts." }, { status: 503 });
  const user = await member(request);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const input = (await request.json().catch(() => null)) as { username?: unknown } | null;
  const name = typeof input?.username === "string" ? input.username.trim().toLowerCase() : "";
  const problem = checkUsername(name);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const db = admin();
  if (!db) return NextResponse.json({ error: "Usernames can't be saved right now. Try again later." }, { status: 503 });
  const { data: existing } = await db.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  const row: { user_id: string; username: string; is_private?: boolean } = existing ? { user_id: user.id, username: name } : { user_id: user.id, username: name, is_private: false };
  const { error } = await db.from("profiles").upsert(row, { onConflict: "user_id" });
  if (error?.code === "23505") return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  if (error) return NextResponse.json({ error: "That didn't save. Try again." }, { status: 500 });
  return NextResponse.json({ username: name });
}
