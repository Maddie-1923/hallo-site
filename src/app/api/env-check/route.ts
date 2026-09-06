import { NextResponse } from "next/server";

// Says which configuration variables the running deployment can see, and
// nothing about what they contain — booleans and a host name only, never a
// key. A deployment missing one of these fails in a way that looks like a
// crash rather than a setting, which is exactly the confusion this answers.
export const dynamic = "force-dynamic";

export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return NextResponse.json({
    supabaseUrl: url ? new URL(url).host : null,
    supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    tmdbKey: !!process.env.TMDB_API_KEY,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
