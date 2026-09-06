"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Movie, Show } from "@/lib/archive";
import { MarkButtons, type MarkState } from "./MarkButtons";
import type { ListOption } from "@/lib/marks";

export interface HeroSlide {
  key: string;
  kindLabel: string;
  title: string;
  href: string;
  backdrop: string | null;
  rating: number | null;
  year: string;
  genres: string[];
  overview: string | null;
  target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };
  marks: MarkState;
}

// The billboard as a carousel. One card, the slides cross-fading inside it,
// chevrons at mid-height on either edge, and a row of bars underneath that
// says where you are. Wraps at both ends — the arrow past the last slide
// lands on the first. Left/right arrow keys work when the card has focus.
export function HeroCarousel({ slides, label, lists }: { slides: HeroSlide[]; label: string; lists: ListOption[] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (count === 0) return null;

  return (
    <section className="wrap pt-5">
      <div className="relative aspect-[16/10] sm:aspect-[16/8] min-h-[420px] max-h-[720px] overflow-hidden rounded-[24px] border border-ink/15 shadow-[0_24px_60px_rgba(0,0,0,.5)]">
        {slides.map((s, i) => (
          <Slide key={s.key} slide={s} label={label} active={i === index} lists={lists} />
        ))}

        <Arrow dir={-1} onClick={() => go(-1)} />
        <Arrow dir={1} onClick={() => go(1)} />
      </div>

      {/* The position bars. The current one is long and lit; the rest are
          short stubs. Each is a button, so they page as well as report. */}
      <div className="flex justify-center gap-1.5 mt-3" role="tablist" aria-label="Featured titles">
        {slides.map((s, i) => {
          const on = i === index;
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`${i + 1} of ${count}: ${s.title}`}
              onClick={() => setIndex(i)}
              className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${on ? "w-8 bg-accent-fill" : "w-3 bg-ink/25 hover:bg-ink/50"}`}
            />
          );
        })}
      </div>
    </section>
  );
}

function Slide({ slide: s, label, active, lists }: { slide: HeroSlide; label: string; active: boolean; lists: ListOption[] }) {
  return (
    <div
      className={`absolute inset-0 flex items-end transition-opacity duration-500 ${active ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      aria-hidden={!active}
    >
      {s.backdrop && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.backdrop} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-top" />
      )}
      <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--page) 92%, transparent) 0%, color-mix(in srgb, var(--page) 55%, transparent) 45%, color-mix(in srgb, var(--page) 10%, transparent) 100%)" }} />
      <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--page) 15%, transparent) 0%, color-mix(in srgb, var(--page) 0%, transparent) 30%, color-mix(in srgb, var(--page) 80%, transparent) 78%, color-mix(in srgb, var(--page) 95%, transparent) 100%)" }} />

      {/* Inset past the chevrons on both sides so the copy never sits under them. */}
      <div className="relative w-full px-[clamp(56px,7vw,96px)] pb-[clamp(20px,4vw,40px)] pt-24 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="eyebrow">{label}</div>
          <h1 className="!text-[clamp(40px,7vw,92px)] max-w-[14ch] drop-shadow-[0_2px_24px_rgba(0,0,0,.6)]">
            <Link href={s.href} className="no-underline text-ink hover:text-accent transition-colors" tabIndex={active ? 0 : -1}>
              {s.title}
            </Link>
          </h1>
          <p className="text-sm text-bone mt-4 flex flex-wrap gap-x-2">
            <span className="text-dim">{s.kindLabel}</span>
            {s.rating ? <span className="text-accent font-bold">{s.rating.toFixed(1)} / 10</span> : null}
            <span>{s.year}</span>
            {s.genres.length > 0 && <span className="text-dim">{s.genres.join(" · ")}</span>}
          </p>
          {s.overview && <p className="text-[15px] text-bone max-w-[52ch] mt-3 mb-0 line-clamp-2 hidden sm:block">{s.overview}</p>}
        </div>
        <div className="shrink-0">
          <MarkButtons target={s.target} state={s.marks} lists={lists} size="lg" />
        </div>
      </div>
    </div>
  );
}

function Arrow({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === 1 ? "Next title" : "Previous title"}
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 ${dir === 1 ? "right-4" : "left-4"} z-10 w-11 h-11 rounded-full border border-ink/25 text-ink flex items-center justify-center transition-colors cursor-pointer hover:border-accent-fill hover:text-accent`}
      style={{ background: "color-mix(in srgb, var(--page) 55%, transparent)", backdropFilter: "blur(8px)" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === 1 ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"} />
      </svg>
    </button>
  );
}
