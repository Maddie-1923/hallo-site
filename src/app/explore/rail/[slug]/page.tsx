import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { InfiniteGrid } from "@/components/InfiniteGrid";
import { gridPage } from "@/lib/grid-pages";
import { EXPLORE_RAILS } from "@/lib/explore-rails";
import { regionName, visitorRegion } from "@/lib/region";

// Where a built-in row's heading leads: everything in that row as a grid.
// More load by themselves as the visitor scrolls (InfiniteGrid).

export async function generateMetadata({ params }: PageProps<"/explore/rail/[slug]">): Promise<Metadata> {
  const rail = EXPLORE_RAILS[(await params).slug];
  return { title: rail ? `${rail.title(regionName(await visitorRegion()))} — Kodigo` : "Explore — Kodigo" };
}

export default async function RailPage({ params }: PageProps<"/explore/rail/[slug]">) {
  const { slug } = await params;
  const rail = EXPLORE_RAILS[slug];
  if (!rail) notFound();
  const region = await visitorRegion();
  const source = { kind: "rail" as const, slug };
  const first = await gridPage(source, 1);
  const backLabel = rail.back === "/shows" ? "Shows" : rail.back === "/movies" ? "Movies" : "Explore";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <Link href={rail.back} className="text-[12.5px] font-semibold text-dim no-underline hover:text-ink">
          ← {backLabel}
        </Link>
        <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase !m-0 mt-3">{rail.title(regionName(region))}</h1>
        <InfiniteGrid filterable source={source} first={first} empty="Nothing here right now." />
      </main>
      <SiteFooter />
    </div>
  );
}
