import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { BrowsePage } from "@/components/BrowsePage";
import { GENRES, NETWORKS, parse, slug } from "@/lib/browse";
import { browseResults } from "@/lib/browse-actions";
import { visitorRegion } from "@/lib/region";
import { regionServices } from "@/lib/tmdb";

type Params = PageProps<"/browse/[[...filters]]">;

// Browse at /browse/<films|series>/<filter>/<value>/…, one address per
// combination, with a title search engines can use.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const f = parse((await params).filters);
  const genre = GENRES[f.kind].find(([, n]) => slug(n) === f.genre)?.[1];
  const network = NETWORKS.find(([, n]) => slug(n) === f.network)?.[1];
  const bits = [genre, f.kind === "films" ? "films" : "series", f.decade && `from the ${f.decade}`, network && `on ${network}`].filter(Boolean).join(" ");
  return { title: `${bits.charAt(0).toUpperCase()}${bits.slice(1)} — Kodigo` };
}

export default async function Browse({ params }: Params) {
  const f = parse((await params).filters);
  const [first, services] = await Promise.all([browseResults(f, 1), visitorRegion().then((r) => regionServices(r, 60))]);
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <BrowsePage key={JSON.stringify(f)} filters={f} first={first} services={services} />
      </main>
      <SiteFooter />
    </div>
  );
}
