import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PosterGrid } from "@/components/PosterGrid";
import { EXPLORE_RAILS } from "@/lib/explore-rails";
import { regionName, visitorRegion } from "@/lib/region";
import { accountsOpen } from "@/lib/accounts";
import { optionalLibrary } from "@/lib/library";
import { markLookup } from "@/lib/marks";

// Where a built-in row's heading leads: everything in that row as a grid.
// "Show more" is a link (`?pages=3` draws three of TMDB's pages), so the grid
// renders on the server and survives a reload, as a custom category's does.
const PAGE_CAP = 10;

export async function generateMetadata({ params }: PageProps<"/explore/rail/[slug]">): Promise<Metadata> {
  const rail = EXPLORE_RAILS[(await params).slug];
  return { title: rail ? `${rail.title(regionName(await visitorRegion()))} — Kodigo` : "Explore — Kodigo" };
}

export default async function RailPage({ params, searchParams }: PageProps<"/explore/rail/[slug]">) {
  const { slug } = await params;
  const rail = EXPLORE_RAILS[slug];
  if (!rail) notFound();
  const { pages: asked } = await searchParams;
  const want = Math.min(PAGE_CAP, Math.max(1, Number(asked) || 1));
  const region = await visitorRegion();

  const [pages, lib] = await Promise.all([
    Promise.all(Array.from({ length: want }, (_, i) => rail.page(i + 1, region))),
    accountsOpen ? optionalLibrary() : Promise.resolve({ archive: null }),
  ]);
  const seen = new Set<string>();
  const titles = pages.flat().filter((t) => t.poster && !seen.has(t.key) && seen.add(t.key));
  // TMDB doesn't say how many pages a list has here; a page that came back
  // empty is the end.
  const more = want < PAGE_CAP && (pages[pages.length - 1]?.length ?? 0) > 0;
  const backLabel = rail.back === "/shows" ? "Shows" : rail.back === "/movies" ? "Movies" : "Explore";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <Link href={rail.back} className="text-[12.5px] font-semibold text-dim no-underline hover:text-ink">
          ← {backLabel}
        </Link>
        <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase !m-0 mt-3">{rail.title(regionName(region))}</h1>
        {titles.length === 0 ? <p className="mt-8 text-[13px] text-dim">Nothing here right now.</p> : <PosterGrid titles={titles} marks={markLookup(lib.archive)} />}
        {more && (
          <div className="pt-6 flex justify-center">
            <Link href={`?pages=${want + 1}`} scroll={false} className="h-9 px-5 inline-flex items-center rounded-full bg-piece text-[12.5px] font-semibold text-ink no-underline hover:text-accent">
              Show more
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
