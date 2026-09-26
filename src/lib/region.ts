import "server-only";
import { headers } from "next/headers";

// The visitor's country, for the rows that only mean something locally: what
// is in cinemas, what opens soon, and which age rating a film carries. A film
// playing in American cinemas this week may not open in Manila for a month,
// and a row of it is noise to somebody who can't go and see it.
//
// Where the country comes from, best first:
// 1. The host's own lookup of the visitor's IP. Vercel sends it as
//    `x-vercel-ip-country` (Cloudflare as `cf-ipcountry`). Nothing is stored,
//    and no request goes anywhere else to find it.
// 2. The region in the browser's language, en-PH → PH. This is right for most
//    people and is what a local `next dev` has to go on.
// 3. The US, which is where TMDB's data is fullest.
//
// Reading the headers makes the page render per request rather than once at
// build time. The TMDB calls behind it are still cached for an hour per
// country, so this costs a render, not a round of API calls per visitor.
export const FALLBACK_REGION = "US";

export async function visitorRegion(): Promise<string> {
  const h = await headers();
  const fromHost = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");
  if (fromHost && /^[A-Z]{2}$/.test(fromHost) && fromHost !== "XX") return fromHost;
  const lang = h.get("accept-language") ?? "";
  const m = lang.match(/^[a-z]{2,3}-([A-Z]{2})\b/i);
  if (m) return m[1].toUpperCase();
  return FALLBACK_REGION;
}

/** "the Philippines" → "Philippines"; falls back to the code itself. */
export function regionName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
