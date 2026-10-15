import type { Metadata } from "next";

// Catalogue pages: TMDB's titles, people and filter results, which Kodigo
// draws but didn't write. Kept out of search results — see robots.ts for why
// crawlers are also kept off them. A page's own metadata merges over this
// without naming robots, so the noindex reaches every page underneath.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function CatalogueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
