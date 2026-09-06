import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Both the magic link and the Apple redirect land here with a `code`. Exchanging
// it sets the session cookies, and from then on the proxy keeps them fresh.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";
  // Only ever send people somewhere on this site — an open redirect is the
  // classic way a sign-in link gets abused.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("That sign-in link didn't work. Ask for a new one.")}`);
}
