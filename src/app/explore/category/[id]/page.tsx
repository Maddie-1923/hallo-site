import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { CategoryMenu } from "@/components/CategoryMenu";
import { InfiniteGrid } from "@/components/InfiniteGrid";
import { gridPage } from "@/lib/grid-pages";
import { accountsOpen } from "@/lib/accounts";
import { optionalLibrary } from "@/lib/library";
import { visitorRegion } from "@/lib/region";
import { regionServices } from "@/lib/tmdb";
import { criteriaLine, orderedRails, railCounts, sameID } from "@/lib/saved-rails";

// A custom category's own page, where its heading on Explore leads: the whole
// of what it asks for as a grid of posters — the app's FilterResultsView for a
// saved rail — with the same ••• as the row. It is the owner's alone, so
// anyone else (or anybody while accounts are closed) gets a not-found.
//
// More titles load by themselves as the visitor scrolls (InfiniteGrid).


async function findRail(id: string) {
  if (!accountsOpen) return null;
  const { archive } = await optionalLibrary();
  if (!archive) return null;
  const rail = orderedRails(archive).find((r) => sameID(r.id, id));
  return rail ? { rail, archive } : null;
}

export async function generateMetadata({ params }: PageProps<"/explore/category/[id]">): Promise<Metadata> {
  const found = await findRail((await params).id);
  return { title: found ? `${found.rail.name} — Kodigo` : "Category — Kodigo" };
}

export default async function CategoryPage({ params }: PageProps<"/explore/category/[id]">) {
  const { id } = await params;
  const found = await findRail(id);
  if (!found) notFound();
  const { rail, archive } = found;
  const region = await visitorRegion();
  const source = { kind: "category" as const, id };
  const [services, first] = await Promise.all([regionServices(region, 60), gridPage(source, 1)]);
  const back = rail.catalogue === "Shows" ? "/shows" : "/movies";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <Link href={back} className="text-[12.5px] font-semibold text-dim no-underline hover:text-ink">
          ← {rail.catalogue}
        </Link>
        <div className="mt-3 flex items-start gap-3">
          <div className="min-w-0">
            <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase !m-0">{rail.name}</h1>
            <p className="m-0 mt-2 text-[12.5px] text-dim">{criteriaLine(rail.filter)}</p>
          </div>
          <div className="mt-1">
            <CategoryMenu rail={rail} services={services} counts={railCounts(archive)} leaveTo={back} />
          </div>
        </div>

        <InfiniteGrid source={source} first={first} empty="Nothing matches this category right now." />
      </main>
      <SiteFooter />
    </div>
  );
}
