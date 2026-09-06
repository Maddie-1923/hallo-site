"use client";

import { useEffect, useState } from "react";

// A tall frame with posters cross-fading inside it, the vertical twin of the
// hero's wide one. It stands in for a screenshot for now, and when real
// screenshots exist it keeps the same shape and border so the section does
// not have to be rebuilt around them.
export function PosterFrame({ posters }: { posters: { key: string; src: string }[] }) {
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (posters.length < 2 || paused) return;
    const t = setInterval(() => setAt((i) => (i + 1) % posters.length), 5000);
    return () => clearInterval(t);
  }, [posters.length, paused]);

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setPaused(q.matches);
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      {/* A soft pool of the poster's own colour under the frame, so it sits on
          the page rather than floating on flat grey. */}
      <div aria-hidden className="absolute -inset-8 overflow-hidden pointer-events-none">
        {posters.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.key}
            src={p.src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover blur-[60px] transition-opacity duration-1000"
            style={{ opacity: i === at ? 0.35 : 0 }}
          />
        ))}
      </div>

      <div
        className="relative aspect-[2/3] rounded-[24px] overflow-hidden border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,.6)]"
        style={{ background: "var(--card)" }}
      >
        {posters.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.key}
            src={p.src}
            alt=""
            aria-hidden
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
            style={{ opacity: i === at ? 1 : 0 }}
          />
        ))}
      </div>
    </div>
  );
}
