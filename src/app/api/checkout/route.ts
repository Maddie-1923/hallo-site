import { NextResponse } from "next/server";
import { accountsOpen } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";
import { PRICES, checkoutReady, stripe, type Plan } from "@/lib/stripe";

// Starts a Stripe Checkout for Kodigo Pro and answers with its address. The
// buyer must be signed in, so the subscription can be written to their
// account (client_reference_id) when the webhook hears it went through.
export async function POST(req: Request) {
  if (!checkoutReady || !stripe) return new NextResponse("Web checkout isn't open yet.", { status: 503 });
  if (!accountsOpen) return new NextResponse("Subscribing on the web opens with accounts.", { status: 503 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Sign in to subscribe.", { status: 401 });

  const { plan } = (await req.json().catch(() => ({}))) as { plan?: Plan };
  const price = plan && PRICES[plan];
  if (!price) return new NextResponse("Choose monthly or yearly.", { status: 400 });

  // The address the request came to, so a preview returns to the preview.
  const site = new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    custom_text: { submit: { message: `Renews until you cancel. By subscribing you agree to Kodigo's Terms of use: ${site}/terms` } },
    success_url: `${site}/pro/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/pro`,
  });
  return NextResponse.json({ url: session.url });
}
