"use client";

import Link from "next/link";
import { useState } from "react";
import { AppleMark } from "./StoreIcons";
import type { Subscription } from "@/lib/entitlement";

type Plan = "monthly" | "yearly";
const PLANS: { id: Plan; price: string; per: string; note?: string }[] = [
  { id: "monthly", price: "$1.99", per: "per month" },
  { id: "yearly", price: "$15.99", per: "per year", note: "Save 33%" },
];

/** Opens Stripe's page for managing a web subscription. */
async function openPortal() {
  const res = await fetch("/api/billing-portal", { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  const { url } = await res.json();
  location.href = url;
}

// The Pro page's offer: the two plans, pressed to choose (yearly to begin
// with), and under them the way to pay. On the web it's Stripe, in US dollars,
// charged today: the free trial belongs to the app. Until checkout is set up
// and accounts are open the button says so and does nothing; signed out it
// asks you to sign in; already Pro, it manages the subscription instead.
export function ProCheckout({ ready, signedIn, subscription }: { ready: boolean; signedIn: boolean; subscription: Subscription | null }) {
  const [plan, setPlan] = useState<Plan>("yearly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      location.href = url;
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Checkout didn't open. Try again.");
      setBusy(false);
    }
  };
  const manage = async () => {
    setBusy(true);
    setError(null);
    try {
      await openPortal();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "That didn't open. Try again.");
      setBusy(false);
    }
  };

  const pro = subscription?.pro;
  const primary = "inline-flex items-center justify-center gap-2 min-h-10 py-2 px-5 rounded-full bg-accent-fill text-on-accent text-[1.0417rem] font-semibold no-underline cursor-pointer disabled:cursor-default disabled:opacity-60";

  return (
    <div className="grid gap-2 content-start">
      <div role="radiogroup" aria-label="Plan" className="grid gap-2">
        {PLANS.map((p) => {
          const on = plan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPlan(p.id)}
              className={`text-left rounded-shell bg-piece p-3 flex items-end justify-between gap-3 cursor-pointer transition-shadow ${on ? "ring-[1.5px] ring-inset ring-accent-fill" : "hover:ring-1 hover:ring-inset hover:ring-hair"}`}
            >
              <span className="flex items-start gap-3">
                {/* The radio's dot. */}
                <span aria-hidden className={`mt-1 w-4 h-4 shrink-0 rounded-full border-[1.5px] flex items-center justify-center ${on ? "border-accent-fill" : "border-hair"}`}>
                  {on && <span className="w-2 h-2 rounded-full bg-accent-fill" />}
                </span>
                <span>
                  <span className="block display text-[clamp(40px,4.4vw,52px)] leading-none text-ink">{p.price}</span>
                  <span className="block mt-1 text-[1.0417rem] text-dim">{p.per}</span>
                </span>
              </span>
              {p.note && <span className="inline-flex items-center h-[2.1667rem] px-3 rounded-full bg-accent-fill text-on-accent text-[0.875rem] font-bold uppercase tracking-[.12em]">{p.note}</span>}
            </button>
          );
        })}
      </div>

      <div className="rounded-shell bg-piece p-3 grid gap-2">
        {pro ? (
          <>
            <p className="m-0 text-[1.0417rem] leading-[1.6] text-ink font-semibold">You have Kodigo Pro.</p>
            {subscription?.source === "stripe" ? (
              <button type="button" onClick={manage} disabled={busy} className={primary}>
                {busy ? "Opening…" : "Manage subscription"}
              </button>
            ) : (
              <p className="m-0 text-[1.0417rem] leading-[1.6] text-dim">You subscribed in the app, so it&apos;s managed in your {subscription?.source === "google_play" ? "Google Play" : "Apple Account"} subscriptions.</p>
            )}
          </>
        ) : !ready ? (
          <button type="button" disabled className={primary}>
            Subscribing on the web opens with accounts
          </button>
        ) : !signedIn ? (
          <Link href="/login?next=/pro" className={primary}>
            Sign in to subscribe
          </Link>
        ) : (
          <button type="button" onClick={subscribe} disabled={busy} className={primary}>
            {busy ? "Opening checkout…" : `Subscribe ${plan === "yearly" ? "yearly · $15.99" : "monthly · $1.99"}`}
          </button>
        )}
        {error && (
          <p role="alert" className="m-0 text-[1.0417rem] leading-[1.6] text-loved">
            {error}
          </p>
        )}
        <p className="m-0 text-[1.0417rem] leading-[1.6] text-dim">
          In US dollars, charged today and renewing until you cancel. Payment is handled by Stripe; Kodigo never sees your card. Subscribing means you agree to the{" "}
          <Link href="/terms" className="text-accent no-underline hover:underline">
            Terms of use
          </Link>
          .
        </p>
      </div>

      <span aria-disabled className="inline-flex items-center justify-center gap-2 min-h-10 py-2 px-4 rounded-full bg-[color:var(--quiet)] text-dim text-[1.0417rem] font-semibold">
        <AppleMark />
        Or try 7 days free in the app
      </span>
    </div>
  );
}

/** Settings' "Manage": Stripe's page for a web subscription. */
export function ManageSubscription() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        setError(false);
        try {
          await openPortal();
        } catch {
          setError(true);
          setBusy(false);
        }
      }}
      className="h-8 px-4 rounded-full text-[1.0417rem] font-semibold cursor-pointer disabled:cursor-default disabled:opacity-45 bg-card text-ink border border-hair"
    >
      {error ? "Try again" : busy ? "Opening…" : "Manage"}
    </button>
  );
}
