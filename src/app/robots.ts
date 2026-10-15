import type { MetadataRoute } from "next";

// Kodigo's own pages are open to search engines: the home page, guides, lists,
// members and profiles. The signed-in app and the server's own routes are kept
// out; pages that only make sense signed in (Library, Settings, Search…) stay
// crawlable but say noindex themselves, since a crawler that's barred from a
// page never sees its noindex.
//
// The TMDB catalogue is kept out too: every film, show, episode and person,
// and the browse and rail pages with their endless filter combinations. Opened
// to crawlers on 13 Oct 2026, they walked it link by link — film, cast, their
// other films — over 100,000 distinct titles a day by 15 Oct, each one a fresh
// server render with TMDB and Supabase calls, and most of the month's Vercel
// usage gone in two days. Those pages are TMDB's content rather than Kodigo's,
// which is also what AdSense calls low value. They carry noindex as well
// (their layouts), so any already indexed drop out as they're recrawled.
const CATALOGUE = ["/movie/", "/show/", "/person/", "/browse", "/explore/rail/", "/explore/category/", "/explore/filter"];

// Crawlers that train models or sell SEO data. None sends visitors, and the
// ones that ignore robots.txt are left to Vercel's bot protection. On 15 Oct
// 2026 GPTBot alone made 142,700 requests in a day and GoogleOther (Google's
// non-search crawler) 32,600, out of 220,600 in all.
const SCRAPERS = [
  "GPTBot", "GoogleOther", "ChatGPT-User", "CCBot", "ClaudeBot", "anthropic-ai", "Google-Extended", "PerplexityBot",
  "Bytespider", "Amazonbot", "Applebot-Extended", "meta-externalagent", "AhrefsBot", "SemrushBot",
  "MJ12bot", "DotBot", "PetalBot", "DataForSeoBot", "BLEXBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: SCRAPERS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/app", "/api/", "/auth/", ...CATALOGUE] },
    ],
    sitemap: "https://kodigo.pro/sitemap.xml",
  };
}
