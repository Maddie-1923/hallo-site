"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Movie, Review, Show } from "@/lib/archive";
import { deleteReview, saveReview } from "@/lib/library-actions";
import { HeartRating } from "./HeartRating";
import { MarkHeart } from "./marks";

type Target = { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };

// "Review & catalogue" — where the list menu's row lands. Laid out as bento
// tiles rather than a form: the review is the big tile, the day, the rating
// and the heart each get a small one, and one Save writes them together
// through `saveReview`, which also marks the title watched. Bento is the
// direction the whole site is heading; this is the first piece drawn that way.
export function ReviewPanel({
  target,
  review,
  rating,
  loved,
  signedIn,
}: {
  target: Target;
  review: Review | null;
  rating: number | null;
  loved: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [text, setText] = useState(review?.text ?? "");
  const [watchedOn, setWatchedOn] = useState(review?.watchedOn ?? "");
  const [rewatch, setRewatch] = useState(review?.rewatch ?? false);
  const [spoilers, setSpoilers] = useState(review?.spoilers ?? false);
  const [score, setScore] = useState<number | null>(rating);
  const [heart, setHeart] = useState(loved);
  const title = target.kind === "show" ? target.show.name : target.movie.title;

  const tile = "rounded-2xl border border-hair bg-card p-4";

  function submit() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}#review`);
      return;
    }
    setError(undefined);
    setSaved(false);
    start(async () => {
      const r = await saveReview(target, { text, watchedOn, rewatch, spoilers, rating: score, loved: heart });
      if (r.error) {
        setError(r.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function remove() {
    setError(undefined);
    start(async () => {
      const r = await deleteReview(target);
      if (r.error) {
        setError(r.error);
        return;
      }
      setText("");
      setWatchedOn("");
      setRewatch(false);
      setSpoilers(false);
      router.refresh();
    });
  }

  return (
    <section id="review" className="scroll-mt-24">
      <h2 className="display text-3xl mb-4">Review &amp; catalogue</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`${tile} sm:col-span-2 sm:row-span-2 flex flex-col`}>
          <label htmlFor="review-text" className="eyebrow">Your review</label>
          <textarea
            id="review-text"
            className="field mt-2 flex-1 min-h-[160px] resize-y"
            placeholder={`What did you make of ${title}?`}
            value={text}
            maxLength={10_000}
            onChange={(e) => setText(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-dim mt-3 cursor-pointer">
            <input type="checkbox" className="accent-[var(--accent-fill)]" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} />
            Contains spoilers
          </label>
        </div>

        <div className={tile}>
          <label htmlFor="review-date" className="eyebrow">Watched on</label>
          <input id="review-date" type="date" className="field mt-2" value={watchedOn} onChange={(e) => setWatchedOn(e.target.value)} />
          <label className="flex items-center gap-2 text-xs text-dim mt-3 cursor-pointer">
            <input type="checkbox" className="accent-[var(--accent-fill)]" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} />
            I&rsquo;ve watched this before
          </label>
        </div>

        <div className={`${tile} flex items-center justify-between gap-3`}>
          <div>
            <div className="eyebrow">Rating</div>
            <HeartRating value={score} onChange={setScore} label={`Rate ${title} out of ten`} size={16} className="!justify-start mt-2" />
            <div className="text-xs text-dim mt-1 h-4">
              {score !== null && (
                <>
                  {score} / 10 ·{" "}
                  <button type="button" className="hover:text-ink cursor-pointer" onClick={() => setScore(null)}>
                    clear
                  </button>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            aria-pressed={heart}
            aria-label={heart ? "Remove from favorites" : "Add to favorites"}
            onClick={() => setHeart((h) => !h)}
            className="rounded-full w-12 h-12 flex items-center justify-center shrink-0 border transition-colors cursor-pointer"
            style={{
              background: heart ? "var(--loved)" : "color-mix(in srgb, var(--ink) 12%, transparent)",
              borderColor: heart ? "var(--loved)" : "transparent",
              color: heart ? "#fff" : "var(--ink)",
            }}
          >
            <MarkHeart size={32} />
          </button>
        </div>

        <div className="sm:col-span-3 flex items-center gap-3 flex-wrap">
          <button type="button" className="btn" disabled={pending} onClick={submit}>
            {signedIn ? "Save" : "Sign in to save"}
          </button>
          {review && (
            <button type="button" className="text-sm text-dim hover:text-ink cursor-pointer" disabled={pending} onClick={remove}>
              Remove review
            </button>
          )}
          {saved && <span className="text-sm text-dim">Saved.</span>}
          {error && (
            <span className="text-sm" style={{ color: "var(--movies)" }} role="alert">
              {error}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
