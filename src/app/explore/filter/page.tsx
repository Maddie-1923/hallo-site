import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { InfiniteGrid } from "@/components/InfiniteGrid";
import { gridPage } from "@/lib/grid-pages";
import { FilterButton } from "@/components/CategoryDialog";
import { accountsOpen } from "@/lib/accounts";
import { optionalLibrary } from "@/lib/library";
import { visitorRegion } from "@/lib/region";
import { regionServices } from "@/lib/tmdb";
import { activeCount, criteriaLine, emptyFilter, filterParam, railCounts, readFilterParam } from "@/lib/saved-rails";

export const metadata: Metadata = { title: "Results — Kodigo" };

// What Explore's Filter finds: the app's filter results, as a grid of
// posters. The filter is the link (`?f=`), so the page renders on the server
// and can be shared. Both catalogues take turns when both are asked for.
// Signed in, Browse here can keep the filter as a custom category.

export default async function FilterPage({ searchParams }: PageProps<"/explore/filter">) {
  const { f: param } = await searchParams;
  const f = readFilterParam(typeof param === "string" ? param : undefined) ?? emptyFilter();
  const region = await visitorRegion();
  const lib = accountsOpen ? await optionalLibrary() : { archive: null };

  const source = { kind: "filter" as const, f: filterParam(f) };
  const [services, first] = await Promise.all([regionServices(region, 60), gridPage(source, 1)]);
  const back = f.kinds.length === 2 ? "/explore" : f.kinds[0] === "Shows" ? "/shows" : "/movies";
  const line = criteriaLine(f);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <Link href={back} className="text-[1.0417rem] font-semibold text-dim no-underline hover:text-ink">
          ← Explore
        </Link>
        <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase !m-0 mt-3">Results</h1>
        {line && <p className="m-0 mt-2 text-[1.0417rem] text-dim">{line}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <FilterButton services={services} kinds={f.kinds} initial={f} count={activeCount(f)} counts={lib.archive ? railCounts(lib.archive) : undefined} />
        </div>

        <InfiniteGrid source={source} first={first} empty="Nothing matches these filters." />
      </main>
      <SiteFooter />
    </div>
  );
}
