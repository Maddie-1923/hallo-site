"use client";

import { useEffect, useRef, useState } from "react";

// A sideways row of cards (the cast, more like this) with round chevrons
// halfway down its sides. The row runs the full width, so the next card
// shows cut off at the edge, a sign there is more; right moves on by the
// whole cards in view, and at the end goes back to the start. Left appears once the row has moved. The row
// still scrolls by trackpad, touch or its scrollbar.
export function Rail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [fits, setFits] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      // A step is the whole cards in view: the cut-off one leads the next.
      const first = el.firstElementChild as HTMLElement | null;
      if (first) {
        const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
        const card = first.offsetWidth + gap;
        setStep(Math.max(1, Math.floor((el.clientWidth + gap) / card)) * card);
      }
      setAtStart(el.scrollLeft < 4);
      setFits(el.scrollWidth <= el.clientWidth + 4);
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

  const arrow = "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card/90 backdrop-blur border border-hair text-ink shadow-[0_6px_18px_rgba(0,0,0,.4)] flex items-center justify-center cursor-pointer hover:bg-piece transition-colors";
  return (
    <div className="relative">
      <div ref={ref} className="soft-scroll flex gap-3 overflow-x-auto snap-x pb-3 -mb-3">
        {children}
      </div>
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
