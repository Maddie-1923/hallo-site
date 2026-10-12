import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { appSocialOpen } from "@/lib/accounts";
import { findGifs, gifsOpen } from "@/lib/klipy";

// The apps' GIF picker (docs/gif-plan.md). The apps don't hold KLIPY's key:
// they ask here with the member's access token, the same way they post a
// reply, and this searches KLIPY with the server's key and the strict filter.
// Nothing about the member is passed on to KLIPY.
//
// GET ?q=<words>&page=<n>   (no q: trending)
//   200 { gifs: [{ slug, title, url, still, width, height }] }
//   401 signed out · 503 GIFs or replies switched off
//
// A brake on one member running through the key's allowance: 60 searches a
// minute each, counted in this server instance's memory. It's a brake, not a
// guarantee; KLIPY's own limit is the backstop.
const recent = new Map<string, number[]>();

export async function GET(request: Request) {
  if (!appSocialOpen || !gifsOpen) return NextResponse.json({ error: "GIFs aren't available right now." }, { status: 503 });
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: "Sign in to add a GIF." }, { status: 401 });
  const reader = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
  } = await reader.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Sign in to add a GIF." }, { status: 401 });

  const now = Date.now();
  const mine = (recent.get(user.id) ?? []).filter((t) => now - t < 60_000);
  if (mine.length >= 60) return NextResponse.json({ error: "That's a lot of searching. Wait a moment and try again." }, { status: 429 });
  recent.set(user.id, [...mine, now]);

  const url = new URL(request.url);
  const gifs = await findGifs(url.searchParams.get("q") ?? "", Number(url.searchParams.get("page")) || 1);
  return NextResponse.json({ gifs });
}
