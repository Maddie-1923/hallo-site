"use client";

import { useEffect, useState } from "react";

export interface FrameSlide {
  key: string;
  backdrop: string;
  title: string;
  kind: string;
  year: string;
}

// The landing page's window onto the catalogue: a rounded, glassy frame with
// the week's trending artwork cross-fading inside it, and the same picture
// blurred out behind the frame so the whole page takes its colour from
// whatever is on screen.
//
// Cross-fade rather than slide, because a slide needs the next image decoded
// and positioned before it moves and a fade doesn't care — the frame never
// jumps on a slow connection, it just holds the current picture a moment
// longer.
export function LandingFrame({ slides, children }: { slides: FrameSlide[]; children?: React.ReactNode }) {
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setAt((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  // Motion here is decoration on a page somebody is reading, so it stops for
  // anyone who has asked their system for less of it.
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setPaused(q.matches);
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);

  const current = slides[at];

  return (
    <div className="relative">
      {/* The ambient wash. Sits behind everything, blurred past recognition,
          so it reads as light in the room rather than a second copy of the
          picture. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        {slides.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s.key}
            src={s.backdrop}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-125 blur-[80px] transition-opacity duration-[1600ms]"
            style={{ opacity: i === at ? 0.45 : 0 }}
          />
        ))}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--page) 55%, transparent), var(--page))" }} />
      </div>

      <div className="wrap relative pt-6 pb-14">
        <div
          className="relative rounded-[28px] overflow-hidden border border-white/15 shadow-[0_40px_120px_rgba(0,0,0,.55)]"
          style={{ background: "var(--graphite)" }}
        >
          <div className="relative aspect-[16/10] sm:aspect-[16/8] lg:aspect-[16/6.5]">
            {slides.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s.key}
                src={s.backdrop}
                alt=""
                aria-hidden
                loading={i === 0 ? "eager" : "lazy"}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1600ms]"
                style={{ opacity: i === at ? 1 : 0 }}
              />
            ))}
            {/* Dark at the left and along the bottom, where the words go. */}
            <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,.55) 42%, rgba(0,0,0,.15) 70%, transparent 100%)" }} />
            <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(0,0,0,.7) 0%, transparent 45%)" }} />

            <div className="absolute inset-0 flex flex-col justify-center p-[clamp(20px,4vw,56px)]">{children}</div>

            {/* What you're looking at, bottom right, so the artwork is never
                anonymous. */}
            {current && (
              <div className="absolute right-[clamp(16px,3vw,32px)] bottom-[clamp(14px,2.5vw,26px)] text-right">
                <div className="text-[10px] tracking-[.16em] uppercase text-white/55">{current.kind}</div>
                <div className="text-sm font-semibold text-white/90">
                  {current.title}
                  {current.year && <span className="text-white/50 font-normal"> · {current.year}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Position bars, small and low-contrast: a hint at how many, not a
              control anybody needs to use. */}
          {slides.length > 1 && (
            <div className="absolute left-[clamp(20px,4vw,56px)] bottom-[clamp(14px,2.5vw,26px)] flex gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  aria-label={`Show ${s.title}`}
                  onClick={() => setAt(i)}
                  className="h-[3px] rounded-full transition-all cursor-pointer"
                  style={{
                    width: i === at ? 26 : 12,
                    background: i === at ? "var(--accent-fill)" : "rgba(255,255,255,.3)",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
