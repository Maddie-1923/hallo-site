import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { stripe } from "@/lib/stripe";

export const metadata: Metadata = { title: "Welcome to Kodigo Pro — Kodigo", robots: { index: false } };

const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";

// Where Stripe sends someone after paying. It asks Stripe about the session
// in the address to say which plan it was; Pro itself is switched on by the
// webhook, which may land a moment after this page, so nothing here depends
// on it having arrived.
export default async function Welcome({ searchParams }: PageProps<"/pro/welcome">) {
  const { session_id } = await searchParams;
  let plan: string | null = null;
  let paid = false;
  if (stripe && typeof session_id === "string" && session_id.startsWith("cs_")) {
    try {
      const s = await stripe.checkout.sessions.retrieve(session_id, { expand: ["line_items"] });
      paid = s.status === "complete";
      plan = s.line_items?.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly";
    } catch {
      // An old or mistyped address: say nothing about a plan.
    }
  }
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <div className={`${SHELL} max-w-[46.6667rem] mx-auto`}>
          <div className="rounded-shell bg-piece p-3">
            <h1 className="!text-[clamp(40px,5vw,60px)] !leading-[.9] tracking-[.02em] uppercase">{paid ? "Welcome to Pro" : "Almost there"}</h1>
            <p className="m-0 mt-3 text-[1.0417rem] leading-[1.6] text-mid-tone">
              {paid
                ? `Your ${plan ?? ""} Kodigo Pro is on, here and in the app when you sign in with the same account. A receipt is on its way to your email.`.replace("  ", " ")
                : "We couldn't confirm a payment from this link. If you just paid, it can take a moment; your receipt email is the proof, and Settings shows your plan once it lands."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/calendar" className="inline-flex items-center min-h-10 py-2 px-5 rounded-full bg-accent-fill text-on-accent text-[1.0417rem] font-semibold no-underline">
                Open your calendar
              </Link>
              <Link href="/settings#account" className="inline-flex items-center min-h-10 py-2 px-5 rounded-full bg-card border border-hair text-ink text-[1.0417rem] font-semibold no-underline hover:text-accent">
                Your subscription
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
