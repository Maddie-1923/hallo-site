import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/public-reads";
import { guides } from "@/lib/guides";

const SITE = "https://kodigo.pro";

// The site's own pages, and the members' lists and reviews with the profiles
// and titles they're on. Not every TMDB title: a page that's only TMDB's
// summary and cast is the same page a thousand other sites have, and listing
// thousands of them would tell Google that's what this site is.
const PAGES = ["/", "/explore", "/movies", "/shows", "/lists", "/members", "/about", "/pro", "/whats-new", "/support", "/privacy", "/terms", "/guides"];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const members = await sitemapEntries().catch(() => []);
  return [
    ...PAGES.map((p) => ({ url: `${SITE}${p === "/" ? "" : p}` })),
    ...guides.map((g) => ({ url: `${SITE}${g.href}` })),
    ...members.map(({ path, at }) => ({ url: `${SITE}${path}`, lastModified: at })),
  ];
}
