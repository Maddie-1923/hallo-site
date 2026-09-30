"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Movie, Show } from "@/lib/archive";
import type { ListOption } from "@/lib/marks";
import { MarkButtons, type MarkState } from "./MarkButtons";

export interface WideItem {
  key: string;
  href: string;
  title: string;
  /** The landscape still, card size. */
  backdrop: string;
  /** The title's logo artwork, when TMDB has one. */
  logo: string | null;
  target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };
  /** What the hover buttons show: watchlist, rewatch, heart, review, more. */
  marks: MarkState;
}

// A home-page row the way Netflix sets one: landscape cards, about four
// across with the next one peeking in at the edge to say there is more, and
// the round chevrons the title pages' rails have, halfway down its sides:
// right moves on by the whole cards in view and past the end goes back to
// the start; left appears once the row has moved. On a phone it is a swipe.
//
// Each card is the title's backdrop with its logo artwork over the lower left,
// the way a streaming service shows its catalogue; a title with no logo gets
// its name in the display face instead.
export function WideRow({ title, href, items, lists = [] }: { title: string; href?: string; items: WideItem[]; lists?: ListOption[] }) {
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
    // The whole cards in view: the peeking one leads the next.
    const first = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const card = first ? first.offsetWidth + gap : el.clientWidth;
    el.scrollBy({ left: dir * Math.max(1, Math.floor((el.clientWidth + gap) / card)) * card, behavior: "smooth" });
  }

  if (items.length === 0) return null;

  return (
    <section className="mt-10 first:mt-2">
      <div className="flex items-baseline justify-between pb-1.5 mb-3">
        <h2 className="!font-[family-name:var(--font-body)] !text-[16px] !tracking-[.01em] font-bold text-ink">{title}</h2>
        {href && (
          <Link href={href} className="text-[12px] tracking-[.1em] uppercase text-dim hover:text-accent no-underline">
            More
          </Link>
        )}
      </div>

      <div className="group/row relative">
        <div
          ref={strip}
          onScroll={update}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((it) => (
            // The picture is a box with the link stretched over it, and the
            // marks sit under it rather than on it, as the app lays its cards
            // out: always there, in the page's own colours.
            <div key={it.key} className="shrink-0 snap-start basis-[78%] sm:basis-[44%] lg:basis-[calc((100%-36px)/4.25)]">
              <div className="group/card relative aspect-video rounded-[8px] overflow-hidden bg-card">
                <Link href={it.href} title={it.title} className="absolute inset-0 no-underline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.backdrop} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-[1.04]" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/10 to-transparent" />
                  <div className="absolute left-[7%] right-[35%] bottom-[9%] top-[45%] flex items-end">
                    {it.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.logo} alt={it.title} loading="lazy" className="max-w-full max-h-full object-contain object-left-bottom drop-shadow-[0_2px_8px_rgba(0,0,0,.6)]" />
                    ) : (
                      <span className="display text-white text-[clamp(18px,1.8vw,30px)] leading-[.9] drop-shadow-[0_2px_10px_rgba(0,0,0,.8)] line-clamp-3">{it.title}</span>
                    )}
                  </div>
                </Link>
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[8px] ring-0 group-hover/card:ring-2 ring-accent-fill transition-[box-shadow] ring-inset" />
              </div>
              {/* The marks under the picture: watchlist, rewatch, heart,
                  review and the menu for the rest. */}
              <div className="mt-2 flex items-center">
                <MarkButtons target={it.target} state={it.marks} lists={lists} />
              </div>
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
