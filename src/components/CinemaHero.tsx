"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Movie, Show } from "@/lib/archive";
import { trackMovie, trackShow } from "@/lib/library-actions";
import { nightTokens } from "@/lib/theme";

export interface CinemaSlide {
  key: string;
  /** "Trending film", "Trending series". */
  eyebrow: string;
  title: string;
  href: string;
  backdrop: string;
  /** A smaller cut of the same backdrop, for the blurred light behind the frame. */
  thumb: string;
  tagline: string | null;
  year: string;
  certification: string | null;
  runtime: string | null;
  genres: string[];
  overview: string | null;
  trailer: string | null;
  target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };
  tracked: boolean;
}

// Each slide takes one of the app's theme accents, in turn, so the page
// changes colour with the picture the way a poster campaign would. Raw hexes:
// these sit on dark artwork whatever the visitor's own theme is.
const ACCENTS = ["#E9AF2D", "#88BCBE", "#DE525D", "#A08BD7", "#33BA99", "#BC9876", "#D5708B", "#5A97D7"];

const CREAM = "#F4ECDC";

// The home page's billboard: a framed window onto the week's trending titles,
// one at a time. The big title owns the left and the studio's tagline and the
// facts sit on the right, both on the frame's bottom edge. Arrows
// at mid-height on both sides page through, wrapping at the ends.
export function CinemaHero({ slides }: { slides: CinemaSlide[] }) {
  const [at, setAt] = useState(0);
  const [hover, setHover] = useState(false);
  const [calm, setCalm] = useState(false);
  const [trailer, setTrailer] = useState<string | null>(null);
  // Where a finger went down, for a sideways swipe between slides on a phone.
  const [touchX, setTouchX] = useState<number | null>(null);
  // The slide that is leaving and which way the strip is moving: 1 is the
  // usual right-to-left (the next picture comes in from the right), -1 is
  // the previous arrow or a swipe back.
  const [leaving, setLeaving] = useState<{ from: number; dir: 1 | -1 } | null>(null);
  const count = slides.length;
  const go = useCallback(
    (i: number, dir?: 1 | -1) => {
      const to = ((i % count) + count) % count;
      if (to === at) return;
      setLeaving({ from: at, dir: dir ?? (to > at ? 1 : -1) });
      setAt(to);
    },
    [count, at],
  );

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setCalm(q.matches);
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);

  // Holds still while someone is reading it, watching a trailer, or has asked
  // their system for less motion.
  useEffect(() => {
    if (count < 2 || hover || calm || trailer) return;
    const t = setTimeout(() => go(at + 1, 1), 8000);
    return () => clearTimeout(t);
  }, [at, count, hover, calm, trailer, go]);

  if (count === 0) return null;

  const s = slides[at];
  const accent = ACCENTS[at % ACCENTS.length];

  return (
    <div className="relative" style={{ ["--slide" as string]: accent }}>
      {/* The room's light: the same picture, blurred past recognition, behind
          the frame. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        {slides.map((x, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={x.key}
            src={x.thumb}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-125 blur-[90px] transition-opacity duration-[1400ms]"
            style={{ opacity: i === at ? 0.5 : 0 }}
          />
        ))}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(26,26,25,.35), var(--page) 96%)" }} />
      </div>

      <div className="relative mx-auto w-full max-w-[1400px] px-[clamp(10px,2.4vw,32px)] pt-[clamp(10px,2vw,28px)] pb-[clamp(28px,4vw,56px)]">
        {/* The bezel: a thick, smoky rim around the picture, like the
            reference's device frame. */}
        <div
          className="relative rounded-[clamp(26px,3.6vw,52px)] p-[clamp(5px,.7vw,10px)] shadow-[0_50px_140px_rgba(0,0,0,.6)]"
          style={{ background: "linear-gradient(160deg, rgba(150,138,122,.55), rgba(70,64,58,.55) 45%, rgba(120,110,98,.45))" }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <div
            className="relative overflow-hidden rounded-[clamp(21px,3vw,43px)] bg-[#141312] min-h-[clamp(620px,52vw,760px)] flex flex-col"
            // The frame is always a darkened photograph, so the words inside
            // it draw in Night's colours whatever the page is.
            style={nightTokens}
            onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX === null) return;
              const dx = e.changedTouches[0].clientX - touchX;
              if (Math.abs(dx) > 50) go(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
              setTouchX(null);
            }}
          >
            {slides.map((x, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={x.key}
                src={x.backdrop}
                alt=""
                aria-hidden
                loading={i === 0 || i === (at + 1) % count ? "eager" : "lazy"}
                className="absolute inset-0 w-full h-full object-cover object-[50%_25%]"
                style={slideStyle(i, at, leaving)}
              />
            ))}
            {/* Shade where the words are and nowhere else: up from the bottom,
                where both columns now sit, and a little down the left behind
                the title. The top of the picture is left alone. */}
            <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(12,10,9,.9) 0%, rgba(12,10,9,.55) 26%, transparent 55%)" }} />
            <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(12,10,9,.6) 0%, rgba(12,10,9,.2) 35%, transparent 55%)" }} />

            {/* Both columns sit on the frame's bottom edge: the title on the
                left, the facts on the right, bottoms aligned, so they read as
                one line of furniture under the picture rather than things
                floating in it. */}
            <div className="relative z-10 flex-1 flex flex-col justify-end">
              <div
                key={s.key}
                className="flex flex-col lg:flex-row lg:items-end gap-8 xl:gap-10 px-[clamp(20px,5vw,80px)] pt-24 pb-[clamp(24px,3vw,44px)] animate-[cinema-in_.7s_ease-out]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] tracking-[.06em] uppercase text-white/80 mb-3">{s.eyebrow}:</div>
                  <h1
                    className="!leading-[.84] drop-shadow-[0_4px_30px_rgba(0,0,0,.55)] break-words"
                    style={{ color: CREAM, fontSize: titleSize(s.title) }}
                  >
                    <Link href={s.href} className="no-underline" style={{ color: "inherit" }}>
                      <Title text={s.title} accent={accent} />
                    </Link>
                  </h1>
                  <WatchlistChip slide={s} accent={accent} />

                  {/* Where you are, under the title. */}
                  <div className="flex gap-1.5 mt-7" role="tablist" aria-label="Featured titles">
                    {slides.map((x, i) => (
                      <button
                        key={x.key}
                        type="button"
                        role="tab"
                        aria-selected={i === at}
                        aria-label={`${i + 1} of ${count}: ${x.title}`}
                        onClick={() => go(i)}
                        className="h-[4px] rounded-full transition-all duration-300 cursor-pointer"
                        style={{ width: i === at ? 30 : 12, background: i === at ? accent : "rgba(255,255,255,.35)" }}
                      />
                    ))}
                  </div>
                </div>

                <div className="min-w-0 lg:w-[min(440px,40%)] shrink-0">
                  {s.tagline && (
                    <p className="m-0 mb-3 text-white uppercase tracking-[.04em] leading-[1.15] text-[clamp(15px,1.3vw,18px)] [font-family:var(--font-wide)] font-extrabold drop-shadow-[0_2px_12px_rgba(0,0,0,.7)]">
                      {s.tagline}
                    </p>
                  )}
                  <p className="m-0 text-[14px] text-white/90 flex flex-wrap items-center gap-x-2">
                    {[
                      s.year,
                      s.certification ? (
                        <span key="c" className="px-1 rounded-[2px] text-[#141312] font-bold text-[12px] leading-[18px]" style={{ background: accent }}>
                          {s.certification}
                        </span>
                      ) : null,
                      s.runtime,
                      s.genres.join(", ") || null,
                    ]
                      .filter(Boolean)
                      .flatMap((x, i) => (i ? [<span key={`d${i}`} className="text-white/50">|</span>, <span key={i}>{x}</span>] : [<span key={i}>{x}</span>]))}
                  </p>
                  {s.overview && <p className="m-0 mt-3 text-[14.5px] leading-[1.45] text-white/90 line-clamp-3 drop-shadow-[0_1px_8px_rgba(0,0,0,.8)]">{s.overview}</p>}
                  <div className="flex flex-wrap gap-3 mt-5">
                    {s.trailer && (
                      <button
                        type="button"
                        onClick={() => setTrailer(s.trailer)}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-[3px] text-[14px] font-bold uppercase tracking-[.04em] text-[#141312] cursor-pointer transition-[filter] hover:brightness-110"
                        style={{ background: accent }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                          <path d="M2 1l9 5-9 5z" fill="currentColor" />
                        </svg>
                        Trailer
                      </button>
                    )}
                    <Link
                      href={s.href}
                      className="inline-flex items-center px-4 py-2 rounded-[3px] border-2 border-white/85 text-white text-[14px] font-bold uppercase tracking-[.04em] no-underline hover:bg-white hover:text-[#141312] transition-colors"
                    >
                      Details
                    </Link>
                  </div>
                </div>

              </div>
            </div>

            {/* Previous and next, at mid-height on either edge. Both wrap: past
                the last slide is the first, before the first is the last. Not
                on a phone, where the words stack up the middle of the frame
                and the arrow landed on the watchlist button; a swipe does the
                same job there. */}
            {count > 1 && (
              <>
                <Chevron dir={-1} onClick={() => go(at - 1, -1)} />
                <Chevron dir={1} onClick={() => go(at + 1, 1)} />
              </>
            )}
          </div>
        </div>
      </div>

      {trailer && <TrailerModal id={trailer} onClose={() => setTrailer(null)} />}
    </div>
  );
}

// The pictures move as a strip. The incoming one slides in from the side the
// strip is moving from while the outgoing one slides off the other side; every
// other picture waits unseen. A slide and not a cross-fade, because a strip
// of posters moving right to left is what a carousel says it is.
function slideStyle(i: number, at: number, leaving: { from: number; dir: 1 | -1 } | null): React.CSSProperties {
  const ease = ".9s cubic-bezier(.65,0,.35,1) both";
  if (i === at) {
    return { zIndex: 1, animation: leaving ? `${leaving.dir === 1 ? "slide-in-right" : "slide-in-left"} ${ease}` : undefined };
  }
  if (leaving && i === leaving.from) {
    return { zIndex: 0, animation: `${leaving.dir === 1 ? "slide-out-left" : "slide-out-right"} ${ease}` };
  }
  return { opacity: 0 };
}

// Bebas is tall and narrow, so a short title can be enormous; a long one has
// to come down or it runs to five lines.
function titleSize(title: string) {
  const n = title.length;
  if (n <= 12) return "clamp(60px, 8vw, 136px)";
  if (n <= 22) return "clamp(52px, 6.4vw, 108px)";
  if (n <= 34) return "clamp(44px, 5vw, 84px)";
  return "clamp(38px, 4.2vw, 68px)";
}

// The last word in the slide's colour, spaced out, the way the reference sets
// HUNTING under SKIN WALKER. Only when there is a first part to set it under,
// and only when the word is short enough to stay on one line spaced.
function Title({ text, accent }: { text: string; accent: string }) {
  const cut = text.lastIndexOf(" ");
  const last = cut > 0 ? text.slice(cut + 1) : "";
  if (!last || last.length > 9 || last.length < 3) return <>{text}</>;
  return (
    <>
      {text.slice(0, cut)}
      <span className="block tracking-[.14em]" style={{ color: accent }}>
        {last}
      </span>
    </>
  );
}

function Chevron({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === 1 ? "Next title" : "Previous title"}
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 ${dir === 1 ? "right-[clamp(10px,1.6vw,22px)]" : "left-[clamp(10px,1.6vw,22px)]"} z-20 w-11 h-11 rounded-full border border-white/30 bg-black/35 backdrop-blur-md text-white hidden sm:flex items-center justify-center cursor-pointer transition-colors hover:bg-black/55 hover:border-white/70`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === 1 ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"} />
      </svg>
    </button>
  );
}

function WatchlistChip({ slide: s, accent }: { slide: CinemaSlide; accent: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(s.tracked);

  function add() {
    if (on) {
      router.push(s.href);
      return;
    }
    start(async () => {
      setOn(true);
      const r = s.target.kind === "show" ? await trackShow(s.target.show) : await trackMovie(s.target.movie);
      if (r.error) {
        setOn(false);
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={pending}
      className="mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-[3px] text-[14px] font-semibold text-[#141312] cursor-pointer transition-[filter] hover:brightness-110"
      style={{ background: accent }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
        <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
      </svg>
      {on ? "In your library" : "Add to watchlist"}
    </button>
  );
}

function TrailerModal({ id, onClose }: { id: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Trailer" className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-[1100px] aspect-video rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title="Trailer"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
      <button type="button" onClick={onClose} aria-label="Close trailer" className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white text-xl cursor-pointer">
        ×
      </button>
    </div>
  );
}
