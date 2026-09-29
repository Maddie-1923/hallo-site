import "server-only";
import { accountsOpen } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";

// The signed-in person's Kodigo Pro, from their `entitlements` row (written by
// the Stripe webhook, and later by the stores). Null when accounts are closed,
// nobody's signed in, or they've never subscribed.
export interface Subscription {
  pro: boolean;
  source: "stripe" | "app_store" | "google_play";
  plan: "monthly" | "yearly" | null;
  periodEnd: string | null;
  cancelAtEnd: boolean;
}

export async function signedInSubscription(): Promise<{ signedIn: boolean; subscription: Subscription | null }> {
  if (!accountsOpen) return { signedIn: false, subscription: null };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, subscription: null };
  const { data } = await supabase.from("entitlements").select("pro, source, plan, current_period_end, cancel_at_period_end").eq("user_id", user.id).maybeSingle();
  return {
    signedIn: true,
    subscription: data ? { pro: data.pro, source: data.source, plan: data.plan, periodEnd: data.current_period_end, cancelAtEnd: data.cancel_at_period_end } : null,
  };
}
