"use client";

import { useEffect, useRef, useState } from "react";
import { PosterCard } from "./PosterRow";
import { moreGrid } from "@/lib/grid-actions";
import type { GridPage, GridSource } from "@/lib/grid-pages";

// A poster grid that fetches its next page as the visitor nears the bottom,
// the way a feed does, instead of a "Show more" button. The first page comes
// drawn from the server.
export function InfiniteGrid({ source, first, empty }: { source: GridSource; first: GridPage; empty: string }) {
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

  if (items.length === 0) return <p className="mt-8 text-[13px] text-dim">{empty}</p>;
  return (
    <>
      <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((it) => (
          <PosterCard key={it.key} it={it} lists={first.lists} />
        ))}
      </div>
      <div ref={end} aria-hidden className="h-px" />
      {loading && <p className="pt-6 text-center text-[12.5px] text-dim">Loading more…</p>}
    </>
  );
}
