import "server-only";
import { cache } from "react";
import { signedInSubscription } from "@/lib/entitlement";

// Ads on the website (docs/social-plan.md, step 7): Google AdSense, for
// visitors and free accounts, never for Kodigo Pro and never in the app.
// Nothing loads until NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…) is set, and each
// placement also needs its own ad unit's slot id, so they can be switched on
// one at a time and compared in AdSense's reports.
//
// Consent in the UK, the EEA and Switzerland is Google's own message, set up
// in AdSense → Privacy & messaging; the AdSense script shows it before any
// ad cookie is set. The footer's "Privacy and cookie settings" reopens it.
export const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || null;

export type AdPlace = "rows" | "title" | "profile";

export const AD_SLOTS: Record<AdPlace, string | undefined> = {
  // Between the second and third poster rows on Home, Movies and Shows.
  rows: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ROWS,
  // On a film's, series' or episode's page, between Reviews and More like this.
  title: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TITLE,
  // Under a profile's sections.
  profile: process.env.NEXT_PUBLIC_ADSENSE_SLOT_PROFILE,
};

/** Whether this visitor sees no ads: a Kodigo Pro member. Once per request. */
export const adFree = cache(async () => !!(await signedInSubscription()).subscription?.pro);
