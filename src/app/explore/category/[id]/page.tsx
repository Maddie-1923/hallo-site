import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { CategoryMenu } from "@/components/CategoryMenu";
import { accountsOpen } from "@/lib/accounts";
import { optionalLibrary } from "@/lib/library";
import { visitorRegion } from "@/lib/region";
import { regionServices, savedRailTitles } from "@/lib/tmdb";
import { criteriaLine, orderedRails, railCounts, sameID } from "@/lib/saved-rails";
import { poster, year } from "@/lib/archive";

// A custom category's own page, where its heading on Explore leads: the whole
// of what it asks for as a grid of posters — the app's FilterResultsView for a
// saved rail — with the same ••• as the row. It is the owner's alone, so
// anyone else (or anybody while accounts are closed) gets a not-found.
//
// "Show more" is a link rather than state: `?pages=3` draws the first three
// pages, so the grid is rendered on the server and survives a reload.

const PAGE_CAP = 10;

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

export default async function CategoryPage({ params, searchParams }: PageProps<"/explore/category/[id]">) {
  const { id } = await params;
  const { pages: asked } = await searchParams;
  const found = await findRail(id);
  if (!found) notFound();
  const { rail, archive } = found;
  const region = await visitorRegion();
  const want = Math.min(PAGE_CAP, Math.max(1, Number(asked) || 1));

  const [services, ...results] = await Promise.all([regionServices(region, 60), ...Array.from({ length: want }, (_, i) => savedRailTitles(rail, region, i + 1))]);
  const total = results[0]?.pages ?? 0;
  const seen = new Set<string>();
  const titles = results
    .flatMap((r) =>
      r.kind === "show"
        ? r.titles.map((s) => ({ key: `s${s.id}`, href: `/show/${s.id}`, title: s.name, poster: s.poster_path, sub: year(s.first_air_date) }))
        : r.titles.map((m) => ({ key: `m${m.id}`, href: `/movie/${m.id}`, title: m.title, poster: m.poster_path, sub: year(m.release_date) })),
    )
    .filter((t) => !seen.has(t.key) && seen.add(t.key));
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

        {titles.length === 0 ? (
          <p className="mt-8 text-[13px] text-dim">Nothing matches this category right now.</p>
        ) : (
          <ul className="m-0 mt-6 p-0 list-none grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
            {titles.map((t) => {
              const src = poster(t.poster, "w342");
              return (
                <li key={t.key} className="min-w-0">
                  <Link href={t.href} title={t.title} className="group block rounded-shell bg-piece p-1.5 no-underline text-ink">
                    <span className="block aspect-[2/3] rounded-[10px] overflow-hidden bg-card border border-hair">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center p-3 text-center text-xs text-dim">{t.title}</span>
                      )}
                    </span>
                    <span className="block px-1 pt-1.5 text-[12.5px] leading-[16px] font-semibold truncate group-hover:text-accent transition-colors">{t.title}</span>
                    <span className="block px-1 pb-0.5 text-[12.5px] leading-[16px] text-dim">{t.sub || "—"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {want < Math.min(total, PAGE_CAP) && (
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
