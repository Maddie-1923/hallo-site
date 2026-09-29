import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { HeadingPill } from "@/components/TitleParts";
import { ProCheckout } from "@/components/ProCheckout";
import { accountsOpen } from "@/lib/accounts";
import { signedInSubscription } from "@/lib/entitlement";
import { checkoutReady } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Kodigo Pro — Kodigo",
  description: "Kodigo Pro: the tracker on your phone and on the web, for $1.99 a month or $15.99 a year.",
};

// Kodigo Pro, for someone who finds the website before the app: the price,
// what Pro adds, what stays free, and the questions people ask. One
// subscription covers the app and the website (see the plan's "Free and
// Pro"). The web sells it through Stripe in US dollars, charged at checkout;
// the free week is the app's (ProCheckout). Until Stripe's keys are set and
// accounts are open, the button says so and nothing can charge.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";

const adds: [string, string][] = [
  ["Up next", "Every show you're partway through in one queue, and each episode or whole season checked off in a tap."],
  ["Calendar and reminders", "What airs next, counted down to the day, with a reminder when an episode lands or a film opens."],
  ["The app and the website in step", "One library on your phone and on a computer, and the same subscription unlocks both."],
  ["Stats worth reading", "Hours watched, what you finish and what you drift away from, and the genres and moods you return to."],
  ["Your services first", "Hide what you've watched, and show only what's on the services you pay for."],
  ["No ads", "Pro members never see an ad on the website. The app has none for anyone."],
];

const table: [string, boolean, boolean, boolean][] = [
  ["Browse, read reviews, profiles and lists", true, true, true],
  ["Rate, review and log what you watched", false, true, true],
  ["Follow, like, comment, lists and a profile", false, true, true],
  ["Episode tracking, up next and the calendar", false, false, true],
  ["Sync with the app, import and export", false, false, true],
  ["Stats, hide watched, only my services", false, false, true],
  ["No ads on the website", false, false, true],
];

const faq: [string, string][] = [
  ["How does the free week work?", "It's in the app: it starts the first time you open it, with everything unlocked and no card needed. Subscribing on the website starts Pro straight away, with no free week."],
  ["Does one subscription cover the app and the website?", "Yes. Kodigo Pro is one subscription, whichever you start it on."],
  ["Is the website free to use?", "Reading is free for everyone: title pages, profiles, reviews and lists. A free account lets you rate, review and follow. Tracking is Pro."],
  ["Can I cancel?", "Any time. Subscribed on the website, use Manage subscription in Settings; in the app, your Apple Account's subscriptions. Pro lasts to the end of the period you paid for."],
  ["What currency is it in?", "The website charges in US dollars; your bank converts it if your card is in another currency. The App Store shows its price in your own currency."],
  ["What happens to my library if I stop?", "It stays on your phone. Nothing is deleted, and backup and export keep working whether or not you subscribe."],
];

export default async function ProPage() {
  const { signedIn, subscription } = await signedInSubscription();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-[clamp(12px,2.2vw,32px)] pb-20 flex-1">
        <div className="max-w-[1040px] mx-auto grid grid-cols-[minmax(0,1fr)] gap-8">
          {/* The offer: what it is, the two plans side by side, and the way to get it. */}
          <div className={SHELL}>
            <div className="grid gap-2 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="rounded-shell bg-piece p-3 flex flex-col">
                <h1 className="!text-[clamp(44px,6vw,72px)] !leading-[.9] tracking-[.02em] uppercase">Kodigo Pro</h1>
                <p className="m-0 mt-3 text-[12.5px] leading-[1.6] text-mid-tone max-w-[46ch]">
                  The tracker, on your phone and on the web. Everything you&apos;re watching, what&apos;s next, and when it lands, with one subscription for both.
                </p>
              </div>
              <ProCheckout ready={checkoutReady && accountsOpen} signedIn={signedIn} subscription={subscription} />
            </div>
          </div>

          <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <div>
              <HeadingPill small>What Pro adds</HeadingPill>
            </div>
            <div className={SHELL}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {adds.map(([t, d]) => (
                  <div key={t} className="rounded-shell bg-piece p-3">
                    <div className="text-[12.5px] font-semibold text-ink">{t}</div>
                    <p className="m-0 mt-1 text-[12.5px] leading-[1.6] text-mid-tone">{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <div>
              <HeadingPill small>Free and Pro</HeadingPill>
            </div>
            <div className={SHELL}>
              <div className="rounded-shell bg-piece p-3 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
                  <thead>
                    <tr className="border-b border-hair">
                      <th className="py-[8px] pr-3 text-left font-normal text-dim" />
                      {["Visitor", "Free account", "Pro"].map((h) => (
                        <th key={h} className="py-[8px] px-3 w-[110px] text-center text-[10.5px] font-bold uppercase tracking-[.12em] text-ink">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.map(([row, ...cols]) => (
                      <tr key={row} className="border-b border-hair last:border-b-0">
                        <td className="py-[8px] pr-3 text-ink">{row}</td>
                        {cols.map((on, i) => (
                          <td key={i} className="py-[8px] px-3 text-center">
                            {on ? <span className={i === 2 ? "text-accent font-bold" : "text-ink"}>✓</span> : <span className="text-dim">·</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <div>
              <HeadingPill small>Questions</HeadingPill>
            </div>
            <div className={SHELL}>
              <div className="rounded-shell bg-piece p-3">
                {faq.map(([q, a], i) => (
                  <details key={q} className={`group py-[8px] ${i < faq.length - 1 ? "border-b border-hair" : ""}`} open={i === 0}>
                    <summary className="list-none cursor-pointer flex items-center justify-between gap-3 text-[12.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                      {q}
                      <span aria-hidden className="text-dim transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="m-0 mt-1.5 text-[12.5px] leading-[1.6] text-mid-tone">{a}</p>
                  </details>
                ))}
              </div>
            </div>
            <p className="m-0 px-1 text-[12.5px] text-dim">
              See what&apos;s changed lately on{" "}
              <Link href="/whats-new" className="text-accent no-underline hover:underline">
                What&apos;s new
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
