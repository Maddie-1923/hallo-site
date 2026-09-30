import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Only ever somewhere on this site: an open redirect is the classic way a
    sign-in link gets abused. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/shows";
}

/** Where a fresh sign-in goes: choosing a username first if they haven't
    (nothing of theirs shows publicly until they do), else where they were
    headed. */
export async function landing(supabase: SupabaseClient, userID: string, next: string | null): Promise<string> {
  const { data: profile } = await supabase.from("profiles").select("username").eq("user_id", userID).maybeSingle();
  return profile?.username ? safeNext(next) : "/profile/setup";
}
