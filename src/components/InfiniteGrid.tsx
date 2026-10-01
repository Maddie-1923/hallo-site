"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GENRES } from "@/lib/saved-rails";
import type { PosterRowItem } from "./PosterRow";
import { PosterCard } from "./PosterRow";
import { moreGrid } from "@/lib/grid-actions";
import type { GridPage, GridSource } from "@/lib/grid-pages";

// A poster grid that fetches its next page as the visitor nears the bottom,
// the way a feed does, instead of a "Show more" button. The first page comes
// drawn from the server.
// `filterable` adds a row of choices over the grid — genre, years, rating
// and order — that narrow what's already loaded (and what loads next), so a
// row opened up can be browsed however the visitor likes.
export function InfiniteGrid({ source, first, empty, filterable = false }: { source: GridSource; first: GridPage; empty: string; filterable?: boolean }) {
  const [items, setItems] = useState(first.items);
  const [more, setMore] = useState(first.more);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = end.current;
    if (!el || !more || loading) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setLoading(true);
        moreGrid(source, page + 1)
          .then((next) => {
            setItems((had) => {
              const seen = new Set(had.map((x) => x.key));
              return [...had, ...next.items.filter((x) => !seen.has(x.key))];
            });
            setMore(next.more);
            setPage(page + 1);
          })
          .catch(() => setMore(false))
          .finally(() => setLoading(false));
      },
      // Start a screen early, so the next row is there by the time it's reached.
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [more, loading, page, source]);

  const [genre, setGenre] = useState("");
  const [since, setSince] = useState("");
  const [stars, setStars] = useState("");
  const [sort, setSort] = useState("");
  const shown = useMemo(() => narrow(items, { genre, since: Number(since) || 0, stars: Number(stars) || 0, sort }), [items, genre, since, stars, sort]);
  const narrowed = !!(genre || since || stars || sort);

  if (items.length === 0) return <p className="mt-8 text-[1.0833rem] text-dim">{empty}</p>;
  const select = "pick";
  return (
    <>
      {filterable && (
        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          <span className="pick-wrap">
            <select className={select} aria-label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">Any genre</option>
              {GENRES.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </span>
          <span className="pick-wrap">
            <select className={select} aria-label="From year" value={since} onChange={(e) => setSince(e.target.value)}>
              <option value="">Any year</option>
              {[2026, 2025, 2024, 2023, 2020, 2015, 2010, 2000, 1990, 1980].map((y) => (
                <option key={y} value={y}>
                  {y}+
                </option>
              ))}
            </select>
          </span>
          <span className="pick-wrap">
            <select className={select} aria-label="Rating" value={stars} onChange={(e) => setStars(e.target.value)}>
              <option value="">Any rating</option>
              {[5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  {n}+ stars
                </option>
              ))}
            </select>
          </span>
          <span className="pick-wrap">
            <select className={select} aria-label="Order" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="">Default</option>
              <option value="newest">Newest</option>
              <option value="rated">Highest rated</option>
              <option value="az">A–Z</option>
            </select>
          </span>
          {narrowed && (
            <button type="button" className="h-8 px-2 text-[1.0833rem] font-semibold text-accent hover:underline cursor-pointer" onClick={() => (setGenre(""), setSince(""), setStars(""), setSort(""))}>
              Clear
            </button>
          )}
        </div>
      )}
      {shown.length === 0 && <p className="mt-8 text-[1.0833rem] text-dim">Nothing loaded so far matches. {more ? "Scroll for more." : ""}</p>}
      <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {shown.map((it) => (
          <PosterCard key={it.key} it={it} lists={first.lists} />
        ))}
      </div>
      <div ref={end} aria-hidden className="h-px" />
      {loading && <p className="pt-6 text-center text-[1.0417rem] text-dim">Loading more…</p>}
    </>
  );
}

/** The grid's choices applied to what has loaded: TMDB's genre ids (the
    film or the series id, by the title's kind), the year it came out, its
    0–10 average as stars, then the order. */
function narrow(items: PosterRowItem[], o: { genre: string; since: number; stars: number; sort: string }): PosterRowItem[] {
  const g = GENRES.find((x) => x.key === o.genre);
  const info = (it: PosterRowItem) => {
    const t = it.target.kind === "show" ? it.target.show : it.target.movie;
    const date = it.target.kind === "show" ? it.target.show.first_air_date : it.target.movie.release_date;
    return { genres: (t.genre_ids ?? []) as number[], year: Number((date ?? "").slice(0, 4)) || 0, score: Number(t.vote_average ?? 0), date: date ?? "" };
  };
  let out = items.filter((it) => {
    const i = info(it);
    if (g) {
      const id = it.target.kind === "show" ? g.tvID : g.movieID;
      if (id === null || !i.genres.includes(id)) return false;
    }
    if (o.since && i.year < o.since) return false;
    if (o.stars && i.score < o.stars) return false;
    return true;
  });
  if (o.sort === "newest") out = [...out].sort((a, b) => info(b).date.localeCompare(info(a).date));
  else if (o.sort === "rated") out = [...out].sort((a, b) => info(b).score - info(a).score);
  else if (o.sort === "az") out = [...out].sort((a, b) => a.title.localeCompare(b.title));
  return out;
}
