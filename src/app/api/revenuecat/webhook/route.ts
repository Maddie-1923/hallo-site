import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// RevenueCat tells the site when a subscription bought in the app starts,
// renews, changes, moves between accounts or ends (it hears from Apple and,
// later, Google). Each time, the site asks RevenueCat for the person's whole
// standing rather than trusting the event alone, so events arriving late or
// out of order can't leave the account wrong, and writes it to their row in
// `entitlements` for that store (supabase/migrations/…_entitlements_per_source.sql).
// The apps log in to RevenueCat with the person's Kodigo account id, so the
// app user id is their Supabase user id; anonymous buyers (no account) are
// left to the store's own receipt in the app.
//
// RevenueCat sends the Authorization header set in its dashboard
// (Integrations → Webhooks); REVENUECAT_WEBHOOK_AUTH holds the same value, so
// nobody else can grant Pro. REVENUECAT_SECRET_KEY (a v1 secret key) reads
// the standing. Sandbox (test) purchases count only off the live site.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORES: Record<string, "app_store" | "google_play"> = { app_store: "app_store", mac_app_store: "app_store", play_store: "google_play" };

type Entitlement = { expires_date: string | null; product_identifier: string; purchase_date: string };
type Sub = { store: string; expires_date: string | null; unsubscribe_detected_at: string | null; billing_issues_detected_at: string | null; is_sandbox: boolean; period_type?: string };
type Subscriber = { entitlements: Record<string, Entitlement>; subscriptions: Record<string, Sub> };

export async function POST(req: Request) {
  const auth = process.env.REVENUECAT_WEBHOOK_AUTH;
  const key = process.env.REVENUECAT_SECRET_KEY;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!auth || !key || !serviceKey) return new NextResponse("Not configured.", { status: 503 });
  if (req.headers.get("authorization") !== auth) return new NextResponse("Unauthorized.", { status: 401 });

  const body = (await req.json().catch(() => null)) as { event?: { app_user_id?: string; original_app_user_id?: string; aliases?: string[]; transferred_from?: string[]; transferred_to?: string[] } } | null;
  const e = body?.event;
  if (!e) return NextResponse.json({ received: true });

  // Every Kodigo account the event touches: a transfer moves a purchase from
  // one to another, and both need writing.
  const users = [...new Set([e.app_user_id, e.original_app_user_id, ...(e.aliases ?? []), ...(e.transferred_from ?? []), ...(e.transferred_to ?? [])].filter((x): x is string => !!x && UUID.test(x)))];
  const sandboxOk = process.env.VERCEL_ENV !== "production";
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  for (const user of users) {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user)}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (!res.ok) return new NextResponse("RevenueCat lookup failed.", { status: 502 });
    const { subscriber } = (await res.json()) as { subscriber: Subscriber };
    const pro = subscriber.entitlements?.pro;

    // One row per store this person has bought Pro on; a store with nothing
    // left on it is switched off rather than left saying Pro.
    for (const store of ["app_store", "google_play"] as const) {
      const subs = Object.entries(subscriber.subscriptions ?? {}).filter(([, s]) => STORES[s.store] === store && (sandboxOk || !s.is_sandbox));
      if (!subs.length) {
        await db.from("entitlements").update({ pro: false, status: "expired", updated_at: new Date().toISOString() }).eq("user_id", user).eq("source", store);
        continue;
      }
      // The subscription that runs longest is the one that counts.
      const [product, s] = subs.sort((a, b) => (b[1].expires_date ?? "9999").localeCompare(a[1].expires_date ?? "9999"))[0];
      const active = !s.expires_date || Date.parse(s.expires_date) > Date.now();
      const onPro = !!pro && pro.product_identifier === product && active;
      await db.from("entitlements").upsert(
        {
          user_id: user,
          source: store,
          pro: onPro,
          plan: /annual|year/i.test(product) ? "yearly" : "monthly",
          status: !active ? "expired" : s.billing_issues_detected_at ? "past_due" : s.period_type === "trial" ? "trialing" : "active",
          current_period_end: s.expires_date,
          cancel_at_period_end: !!s.unsubscribe_detected_at,
          store_product_id: product,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,source" },
      );
    }
  }
  return NextResponse.json({ received: true });
}
