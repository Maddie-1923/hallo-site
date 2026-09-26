"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface WideItem {
  key: string;
  href: string;
  title: string;
  /** The landscape still, card size. */
  backdrop: string;
  /** The title's logo artwork, when TMDB has one. */
  logo: string | null;
}

// A home-page row the way Netflix sets one: landscape cards, about four
// across with the next one peeking in at the edge to say there is more, and
// arrows that appear on the row's edges when the pointer is over it. The
// arrows wrap: past the end goes back to the start. On a phone it is a swipe.
//
// Each card is the title's backdrop with its logo artwork over the lower left,
// the way a streaming service shows its catalogue; a title with no logo gets
// its name in the display face instead.
export function WideRow({ title, href, items }: { title: string; href?: string; items: WideItem[] }) {
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
    if (dir === -1 && edges.start) return el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    el.scrollBy({ left: dir * el.clientWidth * 0.92, behavior: "smooth" });
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
            <Link
              key={it.key}
              href={it.href}
              title={it.title}
              className="group/card relative shrink-0 snap-start basis-[78%] sm:basis-[44%] lg:basis-[calc((100%-36px)/4.25)] aspect-video rounded-[8px] overflow-hidden bg-card no-underline"
            >
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
              <span aria-hidden className="absolute inset-0 rounded-[8px] ring-0 group-hover/card:ring-2 ring-accent-fill transition-[box-shadow] ring-inset" />
            </Link>
          ))}
        </div>

        {edges.scrollable && (
          <>
            <EdgeArrow dir={-1} onClick={() => page(-1)} label={`Scroll ${title} back`} />
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
      className={`hidden sm:flex absolute top-0 bottom-0 ${dir === 1 ? "-right-[clamp(16px,3.2vw,64px)] rounded-l-[8px]" : "-left-[clamp(16px,3.2vw,64px)] rounded-r-[8px]"} w-[clamp(16px,3.2vw,64px)] items-center justify-center bg-black/45 text-white opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer`}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === 1 ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"} />
      </svg>
    </button>
  );
}
