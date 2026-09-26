"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Movie, Show } from "@/lib/archive";
import { trackMovie, trackShow } from "@/lib/library-actions";

export interface CinemaSlide {
  key: string;
  /** "Trending film", "Trending series". */
  eyebrow: string;
  title: string;
  href: string;
  backdrop: string;
  /** A smaller cut of the same backdrop for the "What's next" thumbnails. */
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
// one at a time. The big title owns the left, the studio's tagline and the
// facts sit on the right, and a "What's next" tray in the corner shows the
// two slides coming up. The nav rides inside the frame (passed in as `nav`),
// so the picture starts at the top of the page.
export function CinemaHero({ slides, nav }: { slides: CinemaSlide[]; nav?: React.ReactNode }) {
  const [at, setAt] = useState(0);
  const [hover, setHover] = useState(false);
  const [calm, setCalm] = useState(false);
  const [trailer, setTrailer] = useState<string | null>(null);
  const [tray, setTray] = useState(true);
  // Where a finger went down, for a sideways swipe between slides on a phone.
  const [touchX, setTouchX] = useState<number | null>(null);
  const count = slides.length;
  const go = useCallback((i: number) => setAt(((i % count) + count) % count), [count]);

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
    const t = setTimeout(() => go(at + 1), 8000);
    return () => clearTimeout(t);
  }, [at, count, hover, calm, trailer, go]);

  if (count === 0) return nav ? <div className="relative h-16">{nav}</div> : null;

  const s = slides[at];
  const accent = ACCENTS[at % ACCENTS.length];
  const next = [slides[(at + 1) % count], slides[(at + 2) % count]].filter((n) => n.key !== s.key);

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
            onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX === null) return;
              const dx = e.changedTouches[0].clientX - touchX;
              if (Math.abs(dx) > 50) go(at + (dx < 0 ? 1 : -1));
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
                loading={i === 0 ? "eager" : "lazy"}
                className="absolute inset-0 w-full h-full object-cover object-[50%_25%] transition-[opacity,transform] duration-[1400ms] ease-out"
                style={{ opacity: i === at ? 1 : 0, transform: i === at ? "scale(1)" : "scale(1.04)" }}
              />
            ))}
            {/* Shade where the words are and nowhere else: under the nav, down
                the left for the title, up from the bottom, and a little behind
                the right-hand column. */}
            <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.55) 0%, transparent 18%)" }} />
            <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(12,10,9,.82) 0%, rgba(12,10,9,.45) 34%, transparent 55%)" }} />
            <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(270deg, rgba(12,10,9,.7) 0%, rgba(12,10,9,.25) 32%, transparent 50%)" }} />
            <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(12,10,9,.85) 0%, transparent 38%)" }} />

            {nav && <div className="relative z-20 h-20">{nav}</div>}

            <div key={s.key} className="relative z-10 flex-1 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] items-center px-[clamp(20px,5vw,80px)] pt-6 pb-8 lg:pb-[clamp(120px,12vw,170px)] animate-[cinema-in_.7s_ease-out]">
              <div className="min-w-0">
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
              </div>

              <div className="min-w-0 max-w-[440px] lg:justify-self-end lg:mt-24">
                {s.tagline && (
                  <p className="m-0 mb-3 text-white uppercase tracking-[.04em] leading-[1.15] text-[clamp(15px,1.4vw,19px)] [font-family:var(--font-wide)] font-extrabold drop-shadow-[0_2px_12px_rgba(0,0,0,.7)]">
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
                {s.overview && <p className="m-0 mt-3 text-[14.5px] leading-[1.45] text-white/90 line-clamp-4 drop-shadow-[0_1px_8px_rgba(0,0,0,.8)]">{s.overview}</p>}
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

            {/* Where you are, bottom left. */}
            <div className="relative z-10 lg:absolute lg:left-[clamp(20px,5vw,80px)] lg:bottom-[clamp(22px,2.6vw,36px)] px-[clamp(20px,5vw,80px)] lg:px-0 pb-6 lg:pb-0 flex gap-1.5" role="tablist" aria-label="Featured titles">
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

            {/* What's next, in the corner. Closing it only hides the tray; the
                slides keep moving. */}
            {tray && next.length > 0 && (
              <div className="hidden md:block absolute z-10 right-0 bottom-0 pl-7 pr-[clamp(18px,2.4vw,34px)] pt-4 pb-[clamp(18px,2.4vw,30px)] rounded-tl-[34px] bg-[rgba(20,18,17,.62)] backdrop-blur-xl border-t border-l border-white/10">
                <button
                  type="button"
                  aria-label="Hide what's next"
                  onClick={() => setTray(false)}
                  className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#F4ECDC] text-[#141312] flex items-center justify-center cursor-pointer shadow-lg"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
                <div className="text-[15px] font-bold tracking-[.02em] uppercase text-white mb-3">What&apos;s next?</div>
                <div className="flex gap-4">
                  {next.map((n) => (
                    <button
                      key={n.key}
                      type="button"
                      onClick={() => go(slides.indexOf(n))}
                      aria-label={`Show ${n.title}`}
                      className="group relative w-[clamp(130px,11vw,160px)] aspect-[16/10] rounded-[16px] overflow-hidden border-[3px] border-white/25 hover:border-white/70 transition-colors cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={n.thumb} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <span className="absolute inset-x-0 bottom-0 px-2 pb-1.5 pt-5 text-left text-[11px] font-semibold text-white leading-tight line-clamp-2 bg-gradient-to-t from-black/85 to-transparent">
                        {n.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {trailer && <TrailerModal id={trailer} onClose={() => setTrailer(null)} />}
    </div>
  );
}

// Bebas is tall and narrow, so a short title can be enormous; a long one has
// to come down or it runs to five lines.
function titleSize(title: string) {
  const n = title.length;
  if (n <= 12) return "clamp(64px, 9.5vw, 156px)";
  if (n <= 22) return "clamp(56px, 7.6vw, 124px)";
  if (n <= 34) return "clamp(46px, 6vw, 96px)";
  return "clamp(40px, 4.8vw, 76px)";
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
