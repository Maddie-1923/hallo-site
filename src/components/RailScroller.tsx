"use client";

import { useEffect, useRef, useState } from "react";

// The scrolling half of a rail: a hidden-scrollbar strip plus a pair of
// chevrons that page it by one viewport. Server components hand the cards
// in as children so the data stays on the server; this only owns scrolling.
export function RailScroller({ title, children }: { title: string; children: React.ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  function update() {
    const el = strip.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
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
    // A little less than a full width so the last card on screen carries
    // over and the eye keeps its place.
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4 mb-4">
        <h2 className="!text-[clamp(24px,3vw,32px)]">{title}</h2>
        <div className="flex gap-1.5 shrink-0">
          <Chevron dir={-1} onClick={() => page(-1)} disabled={!canLeft} label={`Scroll ${title} back`} />
          <Chevron dir={1} onClick={() => page(1)} disabled={!canRight} label={`Scroll ${title} forward`} />
        </div>
      </div>
      <div
        ref={strip}
        onScroll={update}
        // The strip clips whatever overflows it, and the hover ring sits outside
        // the card, so the strip gets a few pixels of padding on every side and
        // the same amount of negative margin to keep the cards on the grid line.
        className="flex gap-4 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1 -mx-1 pt-1 pb-3 [scroll-padding-inline:4px]"
      >
        {children}
      </div>
    </>
  );
}

function Chevron({ dir, onClick, disabled, label }: { dir: 1 | -1; onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-full border border-hair bg-card text-ink flex items-center justify-center hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:hover:border-hair disabled:hover:text-ink cursor-pointer disabled:cursor-default"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === 1 ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"} />
      </svg>
    </button>
  );
}
