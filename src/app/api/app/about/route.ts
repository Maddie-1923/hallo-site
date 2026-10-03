import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { appSocialOpen } from "@/lib/accounts";
import { cleanLink, MAX_LINKS } from "@/lib/profile-links";
import { checkText } from "@/lib/word-filter";

// A profile's About from the iPhone app: location, quote and links. The
// database takes these from a member directly, but the word filter and the
// link cleaning live here (saveAbout in lib/account-settings.ts), so the app
// comes through the same door with its bearer token instead of a cookie.
//
// POST { location, quote, links } → 200 { location, quote, links } | 4xx { error }
export async function POST(request: Request) {
  if (!appSocialOpen) return NextResponse.json({ error: "Profile changes are paused for now. Try again later." }, { status: 503 });
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
  } = await db.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const input = (await request.json().catch(() => null)) as { location?: unknown; quote?: unknown; links?: unknown } | null;
  const location = (typeof input?.location === "string" ? input.location : "").trim().slice(0, 60);
  const quote = (typeof input?.quote === "string" ? input.quote : "").replace(/\s+/g, " ").trim().slice(0, 210);
  const links: string[] = [];
  for (const raw of (Array.isArray(input?.links) ? input!.links : []).slice(0, MAX_LINKS)) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const clean = cleanLink(raw);
    if (!clean) return NextResponse.json({ error: "One of those links isn't a web address." }, { status: 400 });
    links.push(clean);
  }
  const problem = checkText(`${location}\n${quote}\n${links.join("\n")}`);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const { error } = await db.from("profiles").upsert({ user_id: user.id, location: location || null, quote: quote || null, links }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "That didn't save to your account." }, { status: 500 });
  return NextResponse.json({ location, quote, links });
}
