import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { appSocialOpen } from "@/lib/accounts";
import { writeComment } from "@/lib/comment-core";

// Replies from the iPhone app. The app signs in to the same Supabase project
// but has no site cookie, so it sends its access token as a bearer token and
// this reads everything as that member — the same checks postComment makes,
// through the same writeComment, so a reply from the app can't skip the word
// filter or the hourly cap that one from the browser goes through.
//
// POST { kind: "review" | "list", owner: <user id>, target, body }
//   201 { id, at, body }   400/403/429/503 { error }
export async function POST(request: Request) {
  if (!appSocialOpen) return NextResponse.json({ error: "Replies are paused for now. Try again later." }, { status: 503 });
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });
  const reader = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
  } = await reader.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });

  const input = (await request.json().catch(() => null)) as { kind?: unknown; owner?: unknown; target?: unknown; body?: unknown } | null;
  const kind = input?.kind === "review" || input?.kind === "list" ? input.kind : null;
  if (!kind || typeof input?.owner !== "string" || typeof input.target !== "string" || typeof input.body !== "string")
    return NextResponse.json({ error: "That reply is missing something." }, { status: 400 });

  const r = await writeComment(reader, user.id, kind, input.owner, input.target.slice(0, 200), input.body);
  if (!r.ok) {
    const status = r.error.startsWith("That's a lot") ? 429 : r.error.startsWith("You can't") || r.error.startsWith("Replies are off") ? 403 : r.error.includes("right now") ? 503 : 400;
    return NextResponse.json({ error: r.error }, { status });
  }
  return NextResponse.json({ id: r.id, at: r.at, body: r.text }, { status: 201 });
}
