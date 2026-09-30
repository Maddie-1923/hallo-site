import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { landing } from "@/lib/sign-in-landing";

// After the 6-digit code from the sign-in email: the browser has already
// set the session, so this only decides where they go, as the callback does
// for the link.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);
  return NextResponse.redirect(`${origin}${await landing(supabase, user.id, searchParams.get("next"))}`);
}
