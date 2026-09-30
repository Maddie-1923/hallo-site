import "server-only";
import { accountsOpen } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";

// Whether the signed-in person has Kodigo Pro, which the tracker on the web
// needs (docs/social-plan.md, "Free and Pro"): their entitlements row, from
// the Stripe webhook now and the app stores later. DEV_PRO=on lets a
// signed-in account use it without buying Pro, for testing: on a laptop
// (development) or a Vercel preview, never on the live site.
export async function hasPro(): Promise<boolean> {
  if (!accountsOpen) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  if ((process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") && process.env.DEV_PRO === "on") return true;
  const { data } = await supabase.from("entitlements").select("pro").eq("user_id", user.id).maybeSingle();
  return !!data?.pro;
}
