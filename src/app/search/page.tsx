import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SearchBox } from "@/components/SearchBox";
import { MovieCard, ShowCard } from "@/components/TitleCard";
import { searchTitles } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Search — Kodigo" };

export default async function Search({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const hits = q ? await searchTitles(q) : [];

  return (
    <>
      <SiteNav />
      <main className="wrap flex-1 py-10">
        <h1 className="!text-[clamp(44px,8vw,72px)]">Search</h1>
        <div className="mt-6">
          <SearchBox initial={q} autoFocus={!q} />
        </div>

        {q && hits.length === 0 && (
          <p className="text-dim mt-10">Nothing matched &ldquo;{q}&rdquo;. Try fewer words, or the original title.</p>
        )}

        {hits.length > 0 && (
          <div className="grid gap-4 mt-10 [grid-template-columns:repeat(auto-fill,minmax(130px,1fr))]">
            {hits.map((h) =>
              h.kind === "show" ? (
                <ShowCard key={`s${h.show.id}`} show={h.show} sub={`Show · ${h.show.first_air_date?.slice(0, 4) ?? ""}`} />
              ) : (
                <MovieCard key={`m${h.movie.id}`} movie={h.movie} sub={`Film · ${h.movie.release_date?.slice(0, 4) ?? ""}`} />
              ),
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
