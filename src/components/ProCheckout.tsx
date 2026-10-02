"use client";

import { useState } from "react";
import { AndroidMark, AppleMark } from "./StoreIcons";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/stores";
import type { Subscription } from "@/lib/entitlement";

/** Opens Stripe's page for managing a web subscription. */
async function openPortal() {
  const res = await fetch("/api/billing-portal", { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  const { url } = await res.json();
  location.href = url;
}

// The Pro page's offer: the two plans, and how to get them. Pro is sold in
// the apps (Apple and Google bill it, with the 7-day free trial on iPhone);
// signing in to the app with a Kodigo account carries Pro to the website,
// through RevenueCat's webhook. Already Pro, it says where it's managed
// instead. Web checkout through Stripe is still in the code (the API routes
// and ManageSubscription below) but off: Stripe doesn't take sellers in the
// Philippines.
const PLANS = [
  { price: "$1.99", per: "per month" },
  { price: "$15.99", per: "per year", note: "Save 33%" },
];

export function ProInApp({ subscription }: { subscription: Subscription | null }) {
  const pro = subscription?.pro;
  const store = "inline-flex items-center justify-center gap-2 min-h-10 py-2 px-5 rounded-full text-[1.0417rem] font-semibold no-underline whitespace-nowrap";
  const live = `${store} bg-accent-fill text-on-accent`;
  const soon = `${store} bg-[color:var(--quiet)] text-dim`;
  const badge = (label: string, href: string | null, mark: React.ReactNode) =>
    href ? (
      <a href={href} className={live}>
        {mark}
        {label}
      </a>
    ) : (
      <span className={soon}>
        {mark}
        {label}
        <span className="text-[0.875rem] font-bold uppercase tracking-[.12em]">Soon</span>
      </span>
    );

  return (
    <div className="grid gap-2 content-start">
      <div className="grid gap-2">
        {PLANS.map((p) => (
          <div key={p.per} className="rounded-shell bg-piece p-3 flex items-end justify-between gap-3">
            <span>
              <span className="block display text-[clamp(40px,4.4vw,52px)] leading-none text-ink">{p.price}</span>
              <span className="block mt-1 text-[1.0417rem] text-dim">{p.per}</span>
            </span>
            {p.note && <span className="inline-flex items-center h-[2.1667rem] px-3 rounded-full bg-accent-fill text-on-accent text-[0.875rem] font-bold uppercase tracking-[.12em]">{p.note}</span>}
          </div>
        ))}
      </div>

      <div className="rounded-shell bg-piece p-3 grid gap-2">
        {pro ? (
          <>
            <p className="m-0 text-[1.0417rem] leading-[1.6] text-ink font-semibold">You have Kodigo Pro.</p>
            {subscription?.source === "stripe" ? (
              <ManageSubscription />
            ) : (
              <p className="m-0 text-[1.0417rem] leading-[1.6] text-dim">It&apos;s managed in your {subscription?.source === "google_play" ? "Google Play" : "Apple Account"} subscriptions.</p>
            )}
          </>
        ) : (
          <>
            <p className="m-0 text-[1.0417rem] leading-[1.6] text-ink font-semibold">Get Pro in the app.</p>
            <div className="flex flex-wrap gap-2">
              {badge("App Store", APP_STORE_URL, <AppleMark />)}
              {badge("Google Play", PLAY_STORE_URL, <AndroidMark />)}
            </div>
            <p className="m-0 text-[1.0417rem] leading-[1.6] text-dim">
              Start with 7 days free on iPhone. Sign in to the app with your Kodigo account and Pro works here on the website too. Prices in the app are in your own currency.
            </p>
          </>
        )}
      </div>
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
