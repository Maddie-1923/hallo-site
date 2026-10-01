"use client";

import { useEffect, useRef, useState } from "react";

// A key that answers a press the way every key in the app does
// (`KodigoKeyTraceConfirmation`), with the app's timings: an outline travels
// once round the key clockwise from its top centre (0.85s), then after a beat
// the key fills with its colour and pushes forward while a ring leaves the
// glyph (0.22s), holds (0.6s) and lets go; what the press does happens at the
// end, so the change is seen after the confirmation. A key given no confirm
// colour (turning something off) acts at once. With reduced motion there is
// no stroke: the key fills, holds and lets go.
const TRACE = 850;
const SETTLE = 100;
const FILL = 220;
const HOLD = 600;

export function ConfirmKey({
  label,
  on = false,
  onFill,
  onInk = "#F0EFE9",
  confirm,
  off = false,
  radius,
  className,
  run,
  children,
}: {
  label: string;
  /** Set: drawn filled in `onFill`. */
  on?: boolean;
  onFill?: string;
  onInk?: string;
  /** The colour the confirmation runs in; none, and the key acts at once. */
  confirm?: string;
  off?: boolean;
  /** The key's corner, so the outline runs on its edge. */
  radius: number;
  /** Its size, plate and type at rest. */
  className: string;
  run?: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [phase, setPhase] = useState<"idle" | "trace" | "lit" | "done">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function press() {
    if (!run || phase !== "idle") return;
    if (!confirm) return run();
    // Measured at the press, so the outline fits the key as it is now.
    if (ref.current) setSize({ w: ref.current.offsetWidth, h: ref.current.offsetHeight });
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const at = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
    const lead = reduced ? 0 : TRACE + SETTLE;
    setPhase(reduced ? "lit" : "trace");
    at(lead, () => setPhase("lit"));
    at(lead + FILL + HOLD, () => setPhase("done"));
    at(lead + FILL + HOLD + 300, () => {
      setPhase("idle");
      run();
    });
  }

  // The outline: a rounded rectangle from the top centre, clockwise, on the
  // key's own edge, so its length can be run out from nothing.
  const { w, h } = size;
  const r = radius;
  const i = 0.75;
  const path = w && h ? `M${w / 2} ${i}H${w - r}A${r - i} ${r - i} 0 0 1 ${w - i} ${r}V${h - r}A${r - i} ${r - i} 0 0 1 ${w - r} ${h - i}H${r}A${r - i} ${r - i} 0 0 1 ${i} ${h - r}V${r}A${r - i} ${r - i} 0 0 1 ${r} ${i}Z` : "";
  const lit = phase === "lit";
  return (
    <button
      ref={ref}
      type="button"
      onClick={press}
      disabled={off || !run}
      aria-label={label}
      aria-pressed={on}
      title={label}
      className={`relative transition-[background-color,color] duration-300 enabled:cursor-pointer disabled:opacity-35 disabled:cursor-default ${className}`}
      style={{
        borderRadius: radius,
        ...(on && onFill ? { background: onFill, color: onInk } : {}),
        ...(lit ? { background: confirm, color: onInk, transitionDuration: `${FILL}ms`, animation: "key-pop 380ms ease-out" } : {}),
      }}
    >
      {phase === "trace" && path && (
        <svg className="absolute inset-0 pointer-events-none" width={w} height={h} aria-hidden>
          <path d={path} pathLength={1} fill="none" stroke={confirm} strokeWidth="1.5" strokeDasharray="1" style={{ animation: `key-trace ${TRACE}ms linear forwards` }} />
        </svg>
      )}
      {lit && <span aria-hidden className="absolute left-1/2 top-1/2 -ml-[0.75rem] -mt-[0.75rem] w-[1.5rem] h-[1.5rem] rounded-full border-2 pointer-events-none" style={{ borderColor: confirm, animation: "key-burst 710ms linear forwards" }} />}
      {children}
    </button>
  );
}
