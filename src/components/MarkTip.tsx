"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// The caption on a mark.
//
// Three ways in, because the three ways people use these buttons are
// different. A mouse gets it after a short delay, so sweeping the cursor
// across a rail doesn't set off five captions. A keyboard gets it the moment
// focus lands, with no delay to sit through. A tap gets it for a beat after
// the mark changes, which is the only one of the three a phone can offer at
// all — hover doesn't exist there, and without this the marks are five
// unlabelled circles.
//
// It never carries the only label: every button underneath keeps its
// `aria-label`, which is what a screen reader reads and what survives when
// this doesn't appear.
const HOVER_DELAY = 300;
const AFTER_TAP = 1400;

export function MarkTip({ label, children }: { label: string; children: React.ReactNode }) {
  const host = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);

  function place() {
    const el = host.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Above by default, below when the button is near the top of the window —
    // a caption clipped by the viewport edge is worse than none.
    const below = r.top < 56;
    setPos({ left: r.left + r.width / 2, top: below ? r.bottom + 8 : r.top - 8, below });
  }

  function show(delay = 0) {
    clearTimeout(timer.current);
    if (delay === 0) {
      place();
      setOpen(true);
      return;
    }
    timer.current = setTimeout(() => {
      place();
      setOpen(true);
    }, delay);
  }

  function hide() {
    clearTimeout(timer.current);
    setOpen(false);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  // The page can move under an open caption — a rail scrolls, the window
  // resizes — and a caption left behind at the old coordinates is worse than
  // one that simply goes away.
  useLayoutEffect(() => {
    if (!open) return;
    const onMove = () => hide();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  return (
    <span
      ref={host}
      className="relative inline-flex"
      onMouseEnter={() => show(HOVER_DELAY)}
      onMouseLeave={hide}
      onFocusCapture={() => show(0)}
      onBlurCapture={hide}
      onClick={() => {
        // The label has already changed by the time this runs — the marks
        // update optimistically — so this shows what the tap did rather than
        // what it was about to do.
        show(0);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setOpen(false), AFTER_TAP);
      }}
    >
      {children}
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            className="fixed z-[90] pointer-events-none whitespace-nowrap rounded-lg border border-hair bg-card px-2.5 py-1.5 text-xs font-semibold text-ink shadow-[0_10px_30px_rgba(0,0,0,.55)]"
            style={{
              left: pos.left,
              top: pos.top,
              transform: `translate(-50%, ${pos.below ? "0" : "-100%"})`,
            }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
