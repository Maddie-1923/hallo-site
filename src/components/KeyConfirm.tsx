"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// The app's key confirmation (KodigoConfirmedKey + KodigoKeyTraceConfirmation):
// when a key switches on, it keeps its resting face while a 2px stroke runs
// once round its edge, clockwise from the top centre (0.85s, linear). As the
// stroke closes the key takes its set face (0.22s), a ring and ten specks
// fly out from the glyph and the key pops to 1.06 and settles. Switching off
// is instant. With Reduce Motion the key simply arrives set.
const TRACE = 850;
const SETTLE = 100;

/** `children` draws the face, given whether to show it set. */
export function KeyConfirm({
  active,
  tint,
  corner,
  className = "",
  children,
}: {
  active: boolean;
  tint: string;
  corner: number;
  className?: string;
  children: (set: boolean) => React.ReactNode;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(active);
  const [held, setHeld] = useState(false);
  const [run, setRun] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // A switch is acted on in the render that first sees it, so the set face
  // never shows for a frame before the stroke starts.
  if (active !== seen) {
    setSeen(active);
    const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setHeld(active && !still);
    if (active && !still) setRun(run + 1);
  }

  // The key's size, for the stroke's path.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!held) return;
    const t = setTimeout(() => setHeld(false), TRACE + SETTLE);
    return () => clearTimeout(t);
  }, [held, run]);

  const { w, h } = size;
  const r = Math.min(corner, w / 2, h / 2);
  // The outline, starting and ending at the top centre.
  const path = `M ${w / 2} 1 H ${w - r} A ${r - 1} ${r - 1} 0 0 1 ${w - 1} ${r} V ${h - r} A ${r - 1} ${r - 1} 0 0 1 ${w - r} ${h - 1} H ${r} A ${r - 1} ${r - 1} 0 0 1 1 ${h - r} V ${r} A ${r - 1} ${r - 1} 0 0 1 ${r} 1 H ${w / 2}`;
  const burst = run > 0 && !held && active;

  return (
    <span ref={box} className={`relative inline-flex ${className}`}>
      <span key={`pop${run}`} className={`inline-flex w-full ${burst ? "animate-[key-pop_.45s_ease-out]" : ""}`}>
        {children(active && !held)}
      </span>
      {held && w > 0 && (
        <svg key={`trace${run}`} aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width={w} height={h}>
          <path d={path} pathLength={1} fill="none" stroke={tint} strokeWidth={2} strokeLinecap="round" className="animate-[key-trace_.85s_linear_forwards]" style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
        </svg>
      )}
      {burst && (
        <svg key={`burst${run}`} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible" width="1" height="1">
          <circle r="9" fill="none" stroke={tint} className="animate-[key-ring_.33s_cubic-bezier(.2,.7,.3,1)_forwards]" />
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <circle
                key={i}
                r={1.5 + (i % 3) * 0.5}
                fill={tint}
                className="animate-[key-spark_.52s_.08s_cubic-bezier(.2,.7,.3,1)_both]"
                style={{ "--dx": `${Math.cos(a) * 20}px`, "--dy": `${Math.sin(a) * 20}px` } as React.CSSProperties}
              />
            );
          })}
        </svg>
      )}
    </span>
  );
}
