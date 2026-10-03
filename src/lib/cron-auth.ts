import "server-only";
import { adminClient } from "@/lib/email-links";

// Whether a call to one of the email timers' routes is the database's own
// timer. The timer sends the password it keeps in Supabase's Vault
// (supabase/cron/), and the database is asked whether that's the one it holds
// (public.cron_token_ok, service role only), so the password never has to be
// copied into Vercel by hand: a copy that differed by one invisible character
// refused every call when opening the site (3 Oct 2026), with nothing on
// screen to show why. CRON_SECRET still works when it's set and matches, and
// saves the round trip.
export async function cronAllowed(request: Request): Promise<boolean> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const secret = process.env.CRON_SECRET?.trim();
  if (token && secret && token === secret) return true;

  const db = token ? adminClient() : null;
  if (db) {
    const { data, error } = await db.rpc("cron_token_ok", { token });
    if (error) console.error("cron_token_ok failed", error.message);
    if (data === true) return true;
  }

  // Without a password anywhere, only a development server runs these, by hand.
  return !secret && process.env.NODE_ENV === "development";
}
