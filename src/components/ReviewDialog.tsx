"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Movie, Review, Show } from "@/lib/archive";
import { poster as posterURL, year } from "@/lib/archive";
import { saveReview } from "@/lib/library-actions";
import { HeartRating } from "./HeartRating";
import { MarkHeart } from "./marks";

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
  onClose,
}: {
  target: Target;
  review: Review | null;
  rating: number | null;
  loved: boolean;
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
          <div className="display text-2xl">I watched…</div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-dim hover:text-ink text-xl leading-none cursor-pointer px-2">
            ✕
          </button>
        </div>

        <div className="p-5 grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)]">
          <div className="hidden sm:block">
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-card-hi border border-hair">
              {art && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={art} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          </div>

          <div className="grid gap-4 content-start">
            <div>
              <span className="text-xl font-semibold text-ink">{title}</span>
              {when && <span className="text-dim ml-2">{when}</span>}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" className="accent-[var(--accent-fill)] w-4 h-4" checked={logDate} onChange={(e) => setLogDate(e.target.checked)} />
                Watched on
              </label>
              <input
                type="date"
                className="field !py-1.5 !px-2.5 !w-auto text-sm disabled:opacity-40"
                value={watchedOn}
                disabled={!logDate}
                onChange={(e) => setWatchedOn(e.target.value)}
              />
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" className="accent-[var(--accent-fill)] w-4 h-4" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} />
                I&rsquo;ve watched this before
              </label>
            </div>

            <textarea
              className="field min-h-[150px] resize-y"
              placeholder="Add a review…"
              value={text}
              maxLength={10_000}
              onChange={(e) => setText(e.target.value)}
            />

            <div className="flex flex-wrap items-center justify-between gap-4">
              <label className="flex items-center gap-2.5 text-sm text-dim cursor-pointer">
                <input type="checkbox" className="accent-[var(--accent-fill)] w-4 h-4" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} />
                Contains spoilers
              </label>

              <div className="flex items-end gap-6">
                <div>
                  <div className="eyebrow">Rating</div>
                  <HeartRating value={score} onChange={setScore} label={`Rate ${title} out of ten`} size={20} className="!justify-start mt-1" />
                </div>
                <div className="text-center">
                  <div className="eyebrow">Loved</div>
                  <button
                    type="button"
                    aria-pressed={heart}
                    aria-label={heart ? "Remove from favorites" : "Add to favorites"}
                    onClick={() => setHeart((h) => !h)}
                    className="mt-1 rounded-full w-11 h-11 flex items-center justify-center border transition-colors cursor-pointer"
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
