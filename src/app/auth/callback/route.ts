import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { landing } from "@/lib/sign-in-landing";

// The email link and the Apple and Google redirects land here with a `code`.
// Exchanging it sets the session cookies, and from then on the proxy keeps
// them fresh.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${await landing(supabase, data.user.id, searchParams.get("next"))}`);
  }
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("That sign-in link didn't work. Ask for a new one.")}`);
}
