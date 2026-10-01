"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrailerModal } from "./TrailerPlayer";
import { Day } from "./Day";
import type { Movie, Show } from "@/lib/archive";
import { trackMovie, trackShow } from "@/lib/library-actions";
import { nightTokens } from "@/lib/theme";
import { MarkAdd, MarkBookmark } from "./marks";
import { KeyConfirm } from "./KeyConfirm";

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
  /** The title's logo artwork, drawn in place of the typed title when there. */
  logo: string | null;
  /** A line under the title (the tracker's "Aired 28 September 2026"),
      its date apart so it follows the date setting. */
  note?: string;
  noteDate?: string;
  /** A date ending the eyebrow ("Film coming 18 December"). */
  eyebrowDate?: string;
  target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };
  tracked: boolean;
}

// The accent is the visitor's theme, the same one the day/night pill, the
// nav and every button on the site carry. Fills (the watchlist chip, the
// rating chip, the position bar) take the theme's fill for the
// current scheme and its lettering, so they match the pill exactly; the one
// accent-coloured word in a title takes the theme's night tone, because it is
// type on a darkened photograph and a Day tone like Lagune's deep blue would
// vanish into it.
const FILL = "var(--accent-fill)";
const ON_FILL = "var(--on-accent)";
const TYPE = "var(--accent-night)";

const CREAM = "#F4ECDC";

// The home page's billboard: a framed window onto the week's trending titles,
// one at a time. The big title owns the left and the studio's tagline and the
// facts sit on the right, both on the frame's bottom edge. Arrows
// at mid-height on both sides page through, wrapping at the ends.
// `corner` is drawn in the frame's top-left corner, over the picture; Explore
// puts its Shows/Movies switch there so the billboard and the first row still
// fit one screen.
// `banner`: the size of a title page's banner rather than the full billboard
// (the tracker's), in the page's own gutter and with the shells' curve.
export function CinemaHero({ slides, corner, banner = false }: { slides: CinemaSlide[]; corner?: React.ReactNode; banner?: boolean }) {
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


  return (
    // Clipped sideways only: the glow reaches past the window's edges and
    // would otherwise give the whole page a horizontal scrollbar, but it is
    // meant to spill downward onto the rows below.
    <div className="relative [overflow-x:clip]">
      {/* Netflix's proportions: the card runs nearly the full width of the
          window with a slim gutter each side, and on a desktop its height is
          whatever leaves room for the first row below it (.billboard-fit). */}
      <div className={`relative w-full px-[clamp(16px,3.2vw,64px)] ${banner ? "pt-[clamp(12px,2.2vw,32px)]" : "pt-[clamp(12px,2.2vw,40px)] pb-[clamp(28px,3.5vw,56px)] lg:pb-5"}`}>
        {/* The glow, the way Netflix lifts its billboard off the page: the
            picture itself, blurred into a soft light that spills a little way
            out from behind the frame on every side, so the card looks lit by
            what it is showing. It changes with the slide, fading rather than
            sliding, since light doesn't travel sideways. */}
        <div aria-hidden className={`absolute inset-x-[clamp(16px,3.2vw,64px)] pointer-events-none ${banner ? "top-[clamp(12px,2.2vw,32px)] bottom-0" : "top-[clamp(12px,2.2vw,40px)] bottom-[clamp(28px,3.5vw,56px)] lg:bottom-5"}`}>
          {slides.map((x, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={x.key}
              src={x.thumb}
              alt=""
              className="absolute -inset-[4%] w-[108%] h-[108%] max-w-none object-cover blur-[70px] saturate-[1.5] brightness-[1.15] transition-opacity duration-[1200ms]"
              style={{ opacity: i === at ? 0.8 : 0 }}
            />
          ))}
        </div>

        {/* A hairline round the picture rather than a thick bezel, and a soft
            shadow falling below it, so the card sits in front of its glow. */}
        <div
          className={`relative ${banner ? "rounded-shell" : "rounded-[clamp(22px,3vw,43px)]"} border border-hair shadow-[0_28px_70px_-18px_rgba(0,0,0,.75)]`}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <div
            className={`relative overflow-hidden bg-[#141312] flex flex-col ${banner ? "rounded-[calc(var(--shell-radius)-1px)] min-h-[520px] sm:min-h-[420px] lg:min-h-0 lg:h-[clamp(300px,40vw,540px)]" : "rounded-[calc(clamp(22px,3vw,43px)-1px)] min-h-[640px] sm:min-h-[520px] lg:min-h-[360px] billboard-fit"}`}
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
            {/* Shade where the words are and nowhere else, on layer 2: above
                the pictures (the one showing is layer 1 for its slide-in) and
                below the words (layer 10). Up from the bottom,
                where both columns now sit, and down the left as far as the
                description runs (a little past the middle on a wide screen),
                so a bright picture can't wash the small text out. The top
                right of the picture is left alone. */}
            <div aria-hidden className="absolute inset-0 z-[2] pointer-events-none" style={{ background: "linear-gradient(0deg, rgba(12,10,9,.86) 0%, rgba(12,10,9,.55) 28%, rgba(12,10,9,.2) 45%, transparent 58%)" }} />
            <div aria-hidden className="absolute inset-0 z-[2] pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(12,10,9,.88) 0%, rgba(12,10,9,.72) 30%, rgba(12,10,9,.42) 46%, rgba(12,10,9,.14) 58%, transparent 68%)" }} />
            {/* And deeper in the bottom-left corner, where every word sits, so a
                bright picture (a blue sky, a white kitchen) can't wash them
                out; it fades before the middle, leaving the faces alone. */}
            <div aria-hidden className="absolute inset-0 z-[2] pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 90% at 0% 100%, rgba(12,10,9,.78) 0%, rgba(12,10,9,.55) 40%, rgba(12,10,9,.2) 64%, transparent 80%)" }} />

            {/* The whole picture opens the title, under the words and their
                buttons, which keep their own jobs. Not on a title page's own
                banner, where it would lead back to the page it's on. */}
            {!banner && slides[at] && (
              <Link href={slides[at].href} aria-label={`Open ${slides[at].title}`} tabIndex={-1} className="absolute inset-0 z-[5]" />
            )}

            {/* The words ride with their picture: each slide's words are a
                layer that slides in and out with the same timing as the image,
                so a change reads as the whole poster moving past rather than
                a picture moving under words that swap in place. Only the
                arriving and leaving layers exist at any moment. */}
            <div className="relative z-10 flex-1 pointer-events-none">
              {[at, ...(leaving && leaving.from !== at ? [leaving.from] : [])].map((i) => (
                <div
                  key={slides[i].key}
                  aria-hidden={i !== at}
                  inert={i !== at}
                  className="absolute inset-0 flex flex-col justify-end [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
                  style={slideStyle(i, at, leaving)}
                >
                  <SlideWords slide={slides[i]} onTrailer={setTrailer} />
                </div>
              ))}

              {/* Where you are. It stays put while the words slide, sitting
                  where the words leave room for it under the title. */}
              <div
                className="absolute left-[clamp(20px,5vw,80px)] sm:left-[clamp(84px,7vw,108px)] bottom-[clamp(24px,3vw,44px)] flex gap-1.5 pointer-events-auto"
                role="tablist"
                aria-label="Featured titles"
              >
                {slides.map((x, i) => (
                  <button
                    key={x.key}
                    type="button"
                    role="tab"
                    aria-selected={i === at}
                    aria-label={`${i + 1} of ${count}: ${x.title}`}
                    onClick={() => go(i)}
                    className="h-[4px] rounded-full transition-all duration-300 cursor-pointer"
                    style={{ width: i === at ? 30 : 12, background: i === at ? FILL : "rgba(255,255,255,.35)" }}
                  />
                ))}
              </div>
            </div>

            {corner && <div className="absolute z-20 top-[clamp(14px,2vw,26px)] left-[clamp(20px,5vw,80px)] sm:left-[clamp(84px,7vw,108px)]">{corner}</div>}

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

// The pictures (and their words) move as a strip. The incoming one slides in
// from the side the strip is moving from while the outgoing one slides off the
// other side; every other picture waits unseen. A slide and not a cross-fade, because a strip
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

// One slide's words, all in one column on the left, so the right-hand side of
// the picture is left clear. Everything is set a size down from the old
// two-column layout to fit: the title, then the studio's tagline, the facts,
// a short synopsis, and the buttons in a row. The column sits on the frame's
// bottom edge. The empty line at the foot is where the position bars show
// through, since they stay put while the words slide.
function SlideWords({ slide: s, onTrailer }: { slide: CinemaSlide; onTrailer: (id: string) => void }) {
  return (
    <div className="px-[clamp(20px,5vw,80px)] sm:pl-[clamp(84px,7vw,108px)] pt-24 lg:pt-8 pb-[clamp(24px,3vw,44px)]">
      <div className="max-w-[min(460px,100%)]">
        <div className="text-[11px] tracking-[.08em] uppercase text-white/85 mb-2 [text-shadow:0_1px_2px_rgba(0,0,0,.85),0_0_10px_rgba(0,0,0,.55)]">{s.eyebrow}
          {s.eyebrowDate && <> <Day iso={s.eyebrowDate} style={s.eyebrowDate.slice(0, 4) === String(new Date().getFullYear()) ? "dayMonth" : "long"} /></>}
        </div>
        {/* The title as Netflix sets it: the show's own logo artwork, kept
            compact so it labels the picture rather than covering it. The
            typed title stands in when TMDB has no logo. */}
        <h1 className="!leading-[.86] drop-shadow-[0_4px_30px_rgba(0,0,0,.55)] break-words" style={{ color: CREAM, fontSize: titleSize(s.title) }}>
          <Link href={s.href} className="no-underline block" style={{ color: "inherit" }}>
            {s.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.logo}
                alt={s.title}
                className="block w-auto h-auto max-w-[min(300px,70%)] max-h-[clamp(56px,11vh,110px)] object-contain object-left-bottom drop-shadow-[0_2px_14px_rgba(0,0,0,.6)]"
              />
            ) : (
              <Title text={s.title} />
            )}
          </Link>
        </h1>
        {s.note && <p className="m-0 mt-2 text-[12.5px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,.85),0_0_10px_rgba(0,0,0,.55)]">{s.note}
            {s.noteDate && <> <Day iso={s.noteDate} /></>}
          </p>}

        {s.tagline && (
          <p className="m-0 mt-3 text-white uppercase tracking-[.04em] leading-[1.2] text-[11px] [font-family:var(--font-wide)] font-extrabold [text-shadow:0_1px_2px_rgba(0,0,0,.85),0_0_10px_rgba(0,0,0,.55)]">
            {s.tagline}
          </p>
        )}
        <p className="m-0 mt-1.5 text-[12px] text-white/95 flex flex-wrap items-center gap-x-2 [text-shadow:0_1px_2px_rgba(0,0,0,.85),0_0_10px_rgba(0,0,0,.55)]">
          {[
            s.year,
            s.certification ? (
              <span key="c" className="px-[5px] rounded-[2px] font-semibold text-[10.5px] leading-[16px] tracking-[.02em] [text-shadow:none]" style={{ background: FILL, color: ON_FILL }}>
                {s.certification}
              </span>
            ) : null,
            s.runtime,
            s.genres.join(", ") || null,
          ]
            .filter(Boolean)
            .flatMap((x, i) => (i ? [<span key={`d${i}`} className="text-white/45">|</span>, <span key={i}>{x}</span>] : [<span key={i}>{x}</span>]))}
        </p>
        {s.overview && <p className="m-0 mt-2 text-[12.5px] leading-[1.45] text-white/95 line-clamp-2 [text-shadow:0_1px_2px_rgba(0,0,0,.85),0_0_10px_rgba(0,0,0,.55)]">{s.overview}</p>}

        <div className="flex flex-wrap items-center gap-2 mt-3.5">
          {s.trailer && (
            <button
              type="button"
              onClick={() => onTrailer(s.trailer!)}
              className="inline-flex items-center gap-1.5 px-3.5 py-[6px] rounded-[3px] bg-white text-[#141312] text-[12px] font-bold uppercase tracking-[.04em] cursor-pointer transition-colors hover:bg-white/85"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
                <path d="M2 1l9 5-9 5z" fill="currentColor" />
              </svg>
              Trailer
            </button>
          )}
          <Link
            href={s.href}
            className="inline-flex items-center px-3.5 py-[6px] rounded-[3px] bg-[rgba(109,109,110,.7)] text-white text-[12px] font-bold uppercase tracking-[.04em] no-underline hover:bg-[rgba(109,109,110,.45)] transition-colors"
          >
            Details
          </Link>
          <WatchlistChip slide={s} />
        </div>
        <div aria-hidden className="h-[4px] mt-5" />
      </div>
    </div>
  );
}

// Bebas is tall and narrow, so a short title can be enormous; a long one has
// to come down or it runs to five lines.
function titleSize(title: string) {
  const n = title.length;
  if (n <= 12) return "clamp(40px, 4.2vw, 68px)";
  if (n <= 22) return "clamp(34px, 3.4vw, 54px)";
  if (n <= 34) return "clamp(30px, 2.8vw, 44px)";
  return "clamp(26px, 2.4vw, 38px)";
}

// The last word in the slide's colour, spaced out, the way the reference sets
// HUNTING under SKIN WALKER. Only when there is a first part to set it under,
// and only when the word is short enough to stay on one line spaced.
function Title({ text }: { text: string }) {
  const cut = text.lastIndexOf(" ");
  const last = cut > 0 ? text.slice(cut + 1) : "";
  if (!last || last.length > 9 || last.length < 3) return <>{text}</>;
  return (
    <>
      {text.slice(0, cut)}
      <span className="block tracking-[.14em]" style={{ color: TYPE }}>
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

function WatchlistChip({ slide: s }: { slide: CinemaSlide }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(s.tracked);

  function add() {
    if (on) {
      router.push(s.href);
      return;
    }
    // Set before the save rather than inside it: state set in a transition
    // waits for the whole save and the page refresh, which held the key's
    // confirmation back for seconds.
    setOn(true);
    start(async () => {
      const r = s.target.kind === "show" ? await trackShow(s.target.show) : await trackMovie(s.target.movie);
      if (r.error) {
        setOn(false);
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      router.refresh();
    });
  }

  // The app's confirmed key: the offer is the accent-filled "+ Add"; once
  // saved the key goes to the quiet grey Details wears (Netflix's More Info)
  // and the bookmark takes the accent, after the stroke has run round it.
  // Trailer stays the one white button, the billboard's main act.
  return (
    <KeyConfirm active={on} tint={FILL} corner={3}>
      {(set) => (
        <button
          type="button"
          onClick={add}
          disabled={pending}
          className={`inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[3px] text-[12px] font-semibold cursor-pointer transition-[filter] hover:brightness-110 ${set ? "bg-[rgba(109,109,110,.7)] text-white" : ""}`}
          style={set ? undefined : { background: FILL, color: ON_FILL }}
        >
          {/* The app's marks: a plus until it's on the watchlist, a bookmark once it is. */}
          {set ? <span className="inline-flex" style={{ color: TYPE }}><MarkBookmark size={20} className="-mx-1 -my-[3px]" /></span> : <MarkAdd size={20} className="-mx-1 -my-[3px]" />}
          {set ? "Added" : "Add"}
        </button>
      )}
    </KeyConfirm>
  );
}
