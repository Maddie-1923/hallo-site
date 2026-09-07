"use client";

import { useEffect, useRef, useState } from "react";

// The scrolling half of a rail: a hidden-scrollbar strip plus a pair of
// chevrons that page it by one viewport. Server components hand the cards
// in as children so the data stays on the server; this only owns scrolling.
export function RailScroller({ title, children }: { title: string; children: React.ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  // Where the strip stands, so the chevrons can wrap rather than dead-end.
  // Both are true in the middle of a rail; a rail short enough to need no
  // scrolling has both false and the chevrons stay disabled.
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [scrollable, setScrollable] = useState(false);

  function update() {
    const el = strip.current;
    if (!el) return;
    setScrollable(el.scrollWidth > el.clientWidth + 4);
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
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
    // Wrap around at either end, the way the hero carousel does. A chevron
    // that stops working is a chevron somebody taps twice before deciding it
    // is broken; sending them back to the other end always does something.
    if (dir === 1 && atEnd) {
      el.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    if (dir === -1 && atStart) {
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      return;
    }
    // A little less than a full width so the last card on screen carries
    // over and the eye keeps its place.
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4 mb-4">
        <h2 className="!text-[clamp(24px,3vw,32px)]">{title}</h2>
        <div className="flex gap-1.5 shrink-0">
          <Chevron dir={-1} onClick={() => page(-1)} disabled={!scrollable} label={atStart ? `Jump to the end of ${title}` : `Scroll ${title} back`} />
          <Chevron dir={1} onClick={() => page(1)} disabled={!scrollable} label={atEnd ? `Back to the start of ${title}` : `Scroll ${title} forward`} />
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
