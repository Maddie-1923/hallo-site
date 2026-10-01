import "server-only";
import { accountsOpen } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";
import { live } from "@/lib/pro";

// The signed-in person's Kodigo Pro, from their `entitlements` rows (the
// Stripe webhook's, and the stores' through RevenueCat's). Null when accounts are closed,
// nobody's signed in, or they've never subscribed.
export interface Subscription {
  pro: boolean;
  source: "stripe" | "app_store" | "google_play";
  plan: "monthly" | "yearly" | null;
  periodEnd: string | null;
  cancelAtEnd: boolean;
}

export async function signedInSubscription(): Promise<{ signedIn: boolean; subscription: Subscription | null; email?: string }> {
  if (!accountsOpen) return { signedIn: false, subscription: null };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, subscription: null };
  const { data: rows } = await supabase.from("entitlements").select("pro, source, plan, current_period_end, cancel_at_period_end").eq("user_id", user.id);
  // With more than one, the one giving Pro now, and of those the one that
  // runs longest; otherwise the most recent that ended.
  const data = [...(rows ?? [])].sort((a, b) => Number(live(b)) - Number(live(a)) || (b.current_period_end ?? "9999").localeCompare(a.current_period_end ?? "9999"))[0];
  return {
    signedIn: true,
    email: user.email,
    subscription: data ? { pro: live(data), source: data.source, plan: data.plan, periodEnd: data.current_period_end, cancelAtEnd: data.cancel_at_period_end } : null,
  };
}
