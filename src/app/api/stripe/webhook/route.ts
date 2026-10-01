import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

// Stripe tells the site when a subscription starts, renews, changes or ends,
// and each time the person's Pro is written to their row in `entitlements`
// (supabase/migrations/20260929000000_entitlements.sql), which the site and
// the apps read. Every request is checked against the signing secret, so
// nobody else can grant Pro.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const serviceKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!stripe || !secret || !serviceKey) return new NextResponse("Not configured.", { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new NextResponse("Bad signature.", { status: 400 });
  }

  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const write = async (sub: Stripe.Subscription, userId?: string | null) => {
    const user = userId ?? sub.metadata?.user_id;
    if (!user) return;
    const item = sub.items.data[0];
    const end = (item as unknown as { current_period_end?: number })?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
    await db.from("entitlements").upsert(
      {
        user_id: user,
        source: "stripe",
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        plan: item?.price.recurring?.interval === "year" ? "yearly" : "monthly",
        status: sub.status,
        pro: sub.status === "active" || sub.status === "trialing" || sub.status === "past_due",
        current_period_end: end ? new Date(end * 1000).toISOString() : null,
        cancel_at_period_end: sub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,source" },
    );
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.subscription) await write(await stripe.subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id), s.client_reference_id);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await write(event.data.object);
      break;
  }
  return NextResponse.json({ received: true });
}
