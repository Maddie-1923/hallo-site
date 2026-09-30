import { NextResponse } from "next/server";
import { accountsOpen } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// "Manage subscription": Stripe's own page for changing plan, updating the
// card, seeing receipts or cancelling, for someone who subscribed on the web.
export async function POST(req: Request) {
  if (!stripe || !accountsOpen) return new NextResponse("Not open yet.", { status: 503 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Sign in first.", { status: 401 });
  const { data } = await supabase.from("entitlements").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!data?.stripe_customer_id) return new NextResponse("No web subscription on this account.", { status: 404 });
  // The address the request came to, so a preview returns to the preview.
  const site = new URL(req.url).origin;
  const portal = await stripe.billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${site}/settings#account` });
  return NextResponse.json({ url: portal.url });
}
