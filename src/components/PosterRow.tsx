"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Movie, Show } from "@/lib/archive";
import type { ListOption } from "@/lib/marks";
import { MarkButtons, type MarkState } from "./MarkButtons";

export interface PosterRowItem {
  key: string;
  href: string;
  title: string;
  /** The portrait poster, card size. */
  poster: string | null;
  /** The year, under the title. */
  sub: string;
  target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };
  /** What the keys under the card show. */
  marks: MarkState;
}

// A row laid out the way the app's Explore rails are (DiscoverView's
// railFrame and PosterCard): the heading in the display face on its own
// plate with an arrow to the whole category, then portrait posters, each on
// a raised well with the title and year under the picture and the app's two
// keys under that — More and Add. The round chevrons halfway down the sides
// move the row by the whole cards in view; past the end goes back to the
// start. On a phone it is a swipe.
//
// `extra` sits beside the plate — a custom category's ••• menu — so a row
// somebody made draws the same as the built-in ones. `empty` keeps the
// heading (and that menu) on screen when nothing matches, with the line in
// place of the posters; without it an empty row isn't drawn at all.
export function PosterRow({
  title,
  href,
  items,
  lists = [],
  extra,
  empty,
}: {
  title: string;
  href?: string;
  items: PosterRowItem[];
  lists?: ListOption[];
  extra?: React.ReactNode;
  empty?: string;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false, scrollable: false });

  function update() {
    const el = strip.current;
    if (!el) return;
    setEdges({
      scrollable: el.scrollWidth > el.clientWidth + 4,
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }

  useEffect(() => {
    update();
    const el = strip.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function page(dir: 1 | -1) {
    const el = strip.current;
    if (!el) return;
    if (dir === 1 && edges.end) return el.scrollTo({ left: 0, behavior: "smooth" });
    const first = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const card = first ? first.offsetWidth + gap : el.clientWidth;
    el.scrollBy({ left: dir * Math.max(1, Math.floor((el.clientWidth + gap) / card)) * card, behavior: "smooth" });
  }

  if (items.length === 0 && !empty) return null;

  const heading = (
    <>
      <span className="display text-[24px] leading-none tracking-[.02em] text-ink uppercase translate-y-[1px]">{title}</span>
      {href && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-dim shrink-0">
          <path d="M4 12h15M13 5l7 7-7 7" />
        </svg>
      )}
    </>
  );

  return (
    <section className="mt-10 first:mt-2">
      {/* The heading on its plate, the app's heading pill. The whole plate is
          the link to the category. */}
      <div className="mb-3 flex items-center gap-2">
        {href ? (
          <Link href={href} aria-label={`Show all ${title}`} className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-[10px] bg-piece no-underline hover:[&_svg]:text-ink">
            {heading}
          </Link>
        ) : (
          <h2 className="inline-flex items-center h-11 px-3.5 rounded-[10px] bg-piece !m-0">{heading}</h2>
        )}
        {extra}
      </div>

      {items.length === 0 && <p className="m-0 text-[13px] text-dim">{empty}</p>}

      <div className="group/row relative">
        <div
          ref={strip}
          onScroll={update}
          // Room above and below for the cards' shadows, which a scrolling
          // box would otherwise cut off.
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory py-2 -my-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((it) => (
            // The well: a raised plate holding the card and its keys.
            <div
              key={it.key}
              className="shrink-0 snap-start w-[clamp(150px,13.5vw,196px)] p-2 rounded-[16px] bg-well flex flex-col gap-2 border border-hair/40 shadow-[0_4px_9px_rgba(0,0,0,.35)]"
            >
              {/* The poster and its text on one piece, the poster's top
                  corners matching the piece's and its bottom ones tighter. */}
              <Link href={it.href} title={it.title} className="group/card block rounded-[12px] bg-piece no-underline overflow-hidden">
                <div className="relative aspect-[2/3] rounded-t-[12px] rounded-b-[8px] overflow-hidden bg-card">
                  {it.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.poster} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-[1.04]" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-dim">{it.title}</div>
                  )}
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-t-[12px] rounded-b-[8px] ring-0 group-hover/card:ring-2 ring-accent-fill ring-inset transition-[box-shadow]" />
                </div>
                <div className="px-2.5 pt-2.5 pb-1.5">
                  <div className="text-[12.5px] font-semibold leading-tight text-ink truncate">{it.title}</div>
                  <div className="text-[12px] leading-tight text-dim mt-0.5 truncate">{it.sub || "\u00a0"}</div>
                </div>
              </Link>
              <MarkButtons target={it.target} state={it.marks} lists={lists} variant="keys" />
            </div>
          ))}
        </div>

        {edges.scrollable && (
          <>
            {!edges.start && <EdgeArrow dir={-1} onClick={() => page(-1)} label={`Scroll ${title} back`} />}
            <EdgeArrow dir={1} onClick={() => page(1)} label={`Scroll ${title} forward`} />
          </>
        )}
      </div>
    </section>
  );
}

function EdgeArrow({ dir, onClick, label }: { dir: 1 | -1; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 ${dir === 1 ? "right-2" : "left-2"} w-10 h-10 rounded-full bg-card/90 backdrop-blur border border-hair text-ink shadow-[0_6px_18px_rgba(0,0,0,.4)] items-center justify-center cursor-pointer hover:bg-piece transition-colors`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === 1 ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"} />
      </svg>
    </button>
  );
}
