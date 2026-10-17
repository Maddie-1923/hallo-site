"use client";

import { useLayoutEffect, useRef, useState } from "react";

// A part of the website drawn at a desktop width and shrunk to fit its
// frame, as a screenshot would be, but live. Hidden until it has been
// measured, so it never flashes at full size; inert, because it's a picture
// of the page rather than the page. Its sticky headers are pinned in place
// (globals.css), or they would ride down the frame as the page scrolls.
export function ScaledPage({ width = 1280, height = 800, children }: { width?: number; height?: number; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / width);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={box} className="relative w-full overflow-hidden" style={{ aspectRatio: `${width} / ${height}` }}>
      <div
        inert
        aria-hidden
        className="scaled-page absolute left-0 top-0 origin-top-left"
        style={{ width, height, transform: `scale(${scale})`, opacity: scale ? 1 : 0 }}
      >
        {children}
      </div>
    </div>
  );
}
