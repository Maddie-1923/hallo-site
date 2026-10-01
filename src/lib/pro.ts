import "server-only";
import { accountsOpen } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";

// Whether the signed-in person has Kodigo Pro, which the tracker on the web
// needs (docs/social-plan.md, "Free and Pro"): any of their entitlements
// rows, from the website (Stripe) or the app stores (through RevenueCat). DEV_PRO=on lets a
// signed-in account use it without buying Pro, for testing: on a laptop
// (development) or a Vercel preview, never on the live site.
/** A row that gives Pro now: on, and not past its end by more than a few
    days (the grace a renewal's webhook can take to arrive). One from any
    store will do: the website's, Apple's or Google's. */
export function live(r: { pro: boolean; current_period_end: string | null }) {
  if (!r.pro) return false;
  if (!r.current_period_end) return true;
  return Date.parse(r.current_period_end) > Date.now() - 3 * 86_400_000;
}

export async function hasPro(): Promise<boolean> {
  if (!accountsOpen) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  if ((process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") && process.env.DEV_PRO === "on") return true;
  const { data } = await supabase.from("entitlements").select("pro, current_period_end").eq("user_id", user.id);
  return (data ?? []).some(live);
}
