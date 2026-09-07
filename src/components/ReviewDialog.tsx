"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Movie, Review, Show } from "@/lib/archive";
import { poster as posterURL, year } from "@/lib/archive";
import { saveReview } from "@/lib/library-actions";
import { HeartRating } from "./HeartRating";
import { MarkHeart } from "./marks";
import { MOODS, MOOD_LIMIT } from "@/lib/moods";

type Target = { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };

// Logging a watch, as a dialog rather than a page. The list menu's "Review &
// catalogue" used to jump to a section further down the title page, which
// meant leaving whatever you were looking at to write two sentences. This
// opens over the top of it and closes again.
//
// One Save writes the lot — the review, the date, the rating, the heart, and
// the fact of having watched it — through `saveReview`, so a half-finished
// dialog leaves nothing behind.
export function ReviewDialog({
  target,
  review,
  rating,
  loved,
  moods,
  onClose,
}: {
  target: Target;
  review: Review | null;
  rating: number | null;
  loved: boolean;
  moods: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [text, setText] = useState(review?.text ?? "");
  const [logDate, setLogDate] = useState(review?.watchedOn !== undefined || !review);
  const [watchedOn, setWatchedOn] = useState(review?.watchedOn ?? new Date().toISOString().slice(0, 10));
  const [rewatch, setRewatch] = useState(review?.rewatch ?? false);
  const [spoilers, setSpoilers] = useState(review?.spoilers ?? false);
  const [score, setScore] = useState<number | null>(rating);
  const [heart, setHeart] = useState(loved);
  const [picked, setPicked] = useState<string[]>(moods.slice(0, MOOD_LIMIT));
  const box = useRef<HTMLDivElement>(null);

  const title = target.kind === "show" ? target.show.name : target.movie.title;
  const when = target.kind === "show" ? year(target.show.first_air_date) : year(target.movie.release_date);
  const art = posterURL(target.kind === "show" ? target.show.poster_path : target.movie.poster_path, "w342");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll while this is open, or a trackpad
    // flick moves the title page under the dialog.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  function submit() {
    setError(undefined);
    start(async () => {
      const r = await saveReview(target, {
        text,
        watchedOn: logDate ? watchedOn : "",
        rewatch,
        spoilers,
        rating: score,
        loved: heart,
        moods: picked,
      });
      if (r.error) {
        if (r.error.startsWith("Sign in")) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setError(r.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={`Log ${title}`}
        tabIndex={-1}
        className="w-full max-w-[760px] max-h-[90vh] overflow-y-auto rounded-2xl border border-hair bg-card shadow-[0_40px_120px_rgba(0,0,0,.7)] outline-none"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-hair">
          <div className="text-[15px] font-semibold tracking-[.02em] text-ink">Review &amp; catalogue</div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-dim hover:text-ink text-xl leading-none cursor-pointer px-2">
            ✕
          </button>
        </div>

        <div className="p-5">
          {/* The poster sets the height of this row and the column beside it
              stretches to match, so the title starts on the poster's top edge
              and the review box ends on its bottom one. Anything that isn't
              those three things goes underneath, full width. */}
          <div className="grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)] items-stretch">
            <div className="hidden sm:block">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-card-hi border border-hair shadow-[0_18px_40px_rgba(0,0,0,.65)]">
                {art && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={art} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 min-h-0">
              <div className="flex items-baseline gap-3 flex-wrap">
                {/* Bebas for the title, the body face for the year: the two are
                    saying different things, and matching them made the year
                    read as part of the name. */}
                <span className="display text-[clamp(26px,3.4vw,38px)] leading-[0.8] text-ink">{title}</span>
                {when && <span className="text-[15px] text-dim" style={{ fontFamily: "var(--font-body)" }}>{when}</span>}
              </div>

              {/* One size and one height across the row — the date control was
                  a form field among two labels, which made three things that
                  belong together look like three unrelated ones. */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm">
                <label className="flex items-center gap-2.5 h-9 cursor-pointer">
                  <input type="checkbox" className="accent-[var(--accent-fill)] w-4 h-4" checked={logDate} onChange={(e) => setLogDate(e.target.checked)} />
                  Watched on
                </label>
                <input
                  type="date"
                  className="field !w-auto !h-9 !py-0 !px-2.5 !text-sm disabled:opacity-40"
                  value={watchedOn}
                  disabled={!logDate}
                  onChange={(e) => setWatchedOn(e.target.value)}
                />
                <label className="flex items-center gap-2.5 h-9 cursor-pointer">
                  <input type="checkbox" className="accent-[var(--accent-fill)] w-4 h-4" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} />
                  Rewatched
                </label>
              </div>

              <textarea
                className="field flex-1 min-h-[90px] resize-none"
                placeholder="Add a review…"
                value={text}
                maxLength={10_000}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-5">
            {/* Above the moods: the score is the thing most people came to
                set, and it was sitting under twelve buttons at the foot of
                the dialog. */}
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <div className="eyebrow">Rating</div>
                <HeartRating value={score} onChange={setScore} label={`Rate ${title} out of ten`} size={22} className="!justify-start mt-1.5" />
              </div>
              <div>
                <div className="eyebrow">Loved</div>
                <button
                  type="button"
                  aria-pressed={heart}
                  aria-label={heart ? "Remove from favorites" : "Add to favorites"}
                  onClick={() => setHeart((h) => !h)}
                  className="mt-1.5 rounded-full w-11 h-11 flex items-center justify-center border transition-colors cursor-pointer"
                  style={{
                    background: heart ? "var(--loved)" : "color-mix(in srgb, var(--ink) 12%, transparent)",
                    borderColor: heart ? "var(--loved)" : "transparent",
                    color: heart ? "#fff" : "var(--ink)",
                  }}
                >
                  <MarkHeart size={28} />
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-dim cursor-pointer">
              <input type="checkbox" className="accent-[var(--accent-fill)] w-4 h-4" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} />
              Contains spoilers
            </label>

            {/* The app's moods, three at most — `Library.moodLimit`. Past the
                cap the unpicked ones go quiet rather than disappearing, so the
                row doesn't reflow under the cursor. */}
            <div>
              <div className="eyebrow">How it felt</div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {MOODS.map((m) => {
                  const on = picked.includes(m.id);
                  const full = picked.length >= MOOD_LIMIT && !on;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={on}
                      title={m.label}
                      disabled={full}
                      onClick={() => setPicked((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id].slice(0, MOOD_LIMIT)))}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                        on ? "border-transparent text-graphite" : "border-hair text-dim hover:text-ink"
                      } ${full ? "opacity-35 cursor-default" : ""}`}
                      style={on ? { background: "var(--accent-fill)" } : undefined}
                    >
                      <span aria-hidden className="text-[15px] leading-none">{m.emoji}</span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        <div className="flex items-center justify-end gap-4 px-5 py-4 border-t border-hair">
          {error && (
            <span className="text-sm mr-auto" style={{ color: "var(--movies)" }} role="alert">
              {error}
            </span>
          )}
          <button type="button" className="text-sm text-dim hover:text-ink cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn" disabled={pending} onClick={submit}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
