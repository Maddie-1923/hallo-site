"use client";

import { useEffect, useRef, useState } from "react";

// A sideways row of cards (the cast, more like this) with round chevrons
// halfway down its sides. The cards are sized so a whole number of them fill
// the row and the next one peeks in at the edge, a third of it showing, as a
// sign there is more; never smaller than their own width. Right moves on by
// the whole cards in view, and at the end goes back to the start. Left
// appears once the row has moved. Under the row, instead of a scrollbar, a
// short line for each set of cards, centred, the one in view lit: a press on a line
// goes to it. The row still scrolls by trackpad and touch.
export function Rail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const stepRef = useRef(0);
  const [atStart, setAtStart] = useState(true);
  const [fits, setFits] = useState(false);
  const [step, setStep] = useState(0);
  const [card, setCard] = useState<number | null>(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const first = el.firstElementChild as HTMLElement | null;
      if (first) {
        const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
        const base = Number(first.dataset.base) || first.offsetWidth;
        const W = el.clientWidth;
        const PEEK = 1 / 3;
        // n whole cards and a third of the next: n·w + n·gap + w/3 = W.
        const n = Math.max(1, Math.floor((W - PEEK * base) / (base + gap)));
        const w = Math.max(base, (W - n * gap) / (n + PEEK));
        setCard(w);
        // A step is the whole cards in view: the peeking one leads the next.
        setStep(n * (w + gap));
        stepRef.current = n * (w + gap);
      }
      setAtStart(el.scrollLeft < 4);
      setFits(el.scrollWidth <= el.clientWidth + 4);
      // Which set of cards is in view, and how many sets there are.
      const s = stepRef.current || el.clientWidth;
      const max = el.scrollWidth - el.clientWidth;
      const total = max > 4 ? Math.ceil(max / s - 0.01) + 1 : 1;
      setPages(total);
      setPage(el.scrollLeft >= max - 4 ? total - 1 : Math.round(el.scrollLeft / s));
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, []);

  function go(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else el.scrollBy({ left: dir * (step || el.clientWidth), behavior: "smooth" });
  }

  // Halfway down the cards (the lines under them are left out of the sum).
  const arrow = "absolute top-[calc(50%-9px)] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card/90 backdrop-blur border border-hair text-ink shadow-[0_6px_18px_rgba(0,0,0,.4)] flex items-center justify-center cursor-pointer hover:bg-piece transition-colors";
  return (
    <div className="relative">
      <div ref={ref} className="flex gap-3 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={card ? ({ "--rail-card": `${card}px` } as React.CSSProperties) : undefined}>
        {children}
      </div>
      {pages > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Sets of cards">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={`Set ${i + 1} of ${pages}`}
              onClick={() => ref.current?.scrollTo({ left: i * (step || ref.current.clientWidth), behavior: "smooth" })}
              className={`h-[3px] rounded-full cursor-pointer transition-all duration-300 ${i === page ? "w-7 bg-accent-fill" : "w-4 bg-hair hover:bg-dim"}`}
            />
          ))}
        </div>
      )}
      {!fits && !atStart && (
        <button type="button" onClick={() => go(-1)} aria-label="Back" className={`${arrow} left-2`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      {!fits && (
        <button type="button" onClick={() => go(1)} aria-label="More" className={`${arrow} right-2`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
