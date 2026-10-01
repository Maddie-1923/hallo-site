import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PosterGrid } from "@/components/PosterGrid";
import { FilterButton } from "@/components/CategoryDialog";
import { accountsOpen } from "@/lib/accounts";
import { optionalLibrary } from "@/lib/library";
import { visitorRegion } from "@/lib/region";
import { regionServices, savedRailTitles } from "@/lib/tmdb";
import { activeCount, criteriaLine, emptyFilter, filterParam, railCounts, readFilterParam } from "@/lib/saved-rails";
import { markLookup } from "@/lib/marks";
import { movieCards, showCards } from "@/lib/explore-rails";
import type { GridTitle } from "@/components/PosterGrid";

export const metadata: Metadata = { title: "Filter — Kodigo" };

// What Explore's Filter finds: the app's filter results, as a grid of
// posters. The filter is the link (`?f=`), so the page renders on the server
// and can be shared. Both catalogues take turns when both are asked for.
// Signed in, Browse here can keep the filter as a custom category.
const PAGE_CAP = 10;

export default async function FilterPage({ searchParams }: PageProps<"/explore/filter">) {
  const { f: param, pages: asked } = await searchParams;
  const f = readFilterParam(typeof param === "string" ? param : undefined) ?? emptyFilter();
  const want = Math.min(PAGE_CAP, Math.max(1, Number(asked) || 1));
  const region = await visitorRegion();
  const lib = accountsOpen ? await optionalLibrary() : { archive: null };

  const [services, ...results] = await Promise.all([
    regionServices(region, 60),
    ...f.kinds.flatMap((catalogue) => Array.from({ length: want }, (_, i) => savedRailTitles({ catalogue, filter: f }, region, i + 1))),
  ]);
  const lists: GridTitle[][] = f.kinds.map((_, k) =>
    results.slice(k * want, (k + 1) * want).flatMap((r) =>
      r.kind === "show"
        ? showCards(r.titles)
        : movieCards(r.titles),
    ),
  );
  const mixed: GridTitle[] = [];
  for (let i = 0; i < Math.max(...lists.map((l) => l.length), 0); i++) for (const l of lists) if (l[i]) mixed.push(l[i]);
  const seen = new Set<string>();
  const titles = mixed.filter((t) => t.poster && !seen.has(t.key) && seen.add(t.key));
  const more = want < PAGE_CAP && f.kinds.some((_, k) => (results[k * want]?.pages ?? 0) > want);
  const back = f.kinds.length === 2 ? "/explore" : f.kinds[0] === "Shows" ? "/shows" : "/movies";
  const line = criteriaLine(f);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <Link href={back} className="text-[12.5px] font-semibold text-dim no-underline hover:text-ink">
          ← Explore
        </Link>
        <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase !m-0 mt-3">Filtered</h1>
        {line && <p className="m-0 mt-2 text-[12.5px] text-dim">{line}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <FilterButton services={services} kinds={f.kinds} initial={f} count={activeCount(f)} counts={lib.archive ? railCounts(lib.archive) : undefined} />
        </div>

        {titles.length === 0 ? <p className="mt-8 text-[13px] text-dim">Nothing matches these filters.</p> : <PosterGrid titles={titles} marks={markLookup(lib.archive)} />}

        {more && (
          <div className="pt-6 flex justify-center">
            <Link href={`?f=${filterParam(f)}&pages=${want + 1}`} scroll={false} className="h-9 px-5 inline-flex items-center rounded-full bg-piece text-[12.5px] font-semibold text-ink no-underline hover:text-accent">
              Show more
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
