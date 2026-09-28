"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { RatingMarks } from "./RatingMarks";
import { ReviewActions } from "./ReviewActions";

/** One review as the sheet draws it, wherever it came from. */
export interface SheetReview {
  /** The title's key, which is also the review's address: one review per title. */
  key: string;
  title: string;
  year: string;
  href: string;
  backdrop: string | null;
  poster: string | null;
  /** "S2 E4" when the watch was of certain episodes. */
  episodes?: string;
  /** The episode's own name, for a review of a single episode. */
  episodeTitle?: string;
  /** "YYYY-MM-DD", the day it was watched. */
  date: string | null;
  rating: number | null;
  loved?: boolean;
  rewatch?: boolean;
  text: string;
  spoilers: boolean;
  likes?: number;
  comments?: number;
}

/** A review's own address, the one Share hands out. */
export const reviewPath = (username: string, key: string) => `/u/${username}/review/${key}`;

// The review sheet: the title's still in a shell of its own, who watched it
// and when, the title, the stars, the review, and the way to the title page.
// The Watchlog opens it over the list; a review's own page (the address Share
// hands out) is the same sheet standing on the page, and its link preview is
// drawn to match (app/u/[username]/review/[key]/opengraph-image.tsx).
//
// One inset, 16px, holds everything off the sheet's edges: the picture's
// shell and the writing under it line up on both sides, and the space under
// the last line matches. The picture's corners are the sheet's (28px) less
// that inset, so the two curves run parallel. Down the sheet, the heading
// (who, the title, the stars and date) is set close as one group, and every
// gap between groups after it is the same 16px. (Headings carry an
// unlayered `margin: 0` in globals.css, hence the title's `!mt-2`.)
export function ReviewSheetCard({ r, username, avatar, onClose }: { r: SheetReview; username: string; avatar?: string | null; onClose?: () => void }) {
  const body = (
    <div className="mt-4 grid gap-2 text-[12.5px] leading-[1.6] text-bone">
      {r.text.split(/\n\s*\n/).map((p, i) => (
        <p key={i} className="m-0">
          {p}
        </p>
      ))}
    </div>
  );
  return (
    <>
      <div className="p-4 pb-0 shrink-0">
        <div className="relative aspect-[16/7] rounded-[12px] overflow-hidden bg-card-hi border border-hair">
          {(r.backdrop ?? r.poster) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={(r.backdrop ?? r.poster)!} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close" autoFocus className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center cursor-pointer">
              {/* Drawn rather than the × character, whose place in the font's
                  line sits it off the middle of the circle. */}
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="block">
                <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="p-4 overflow-y-auto">
        <ReviewHeading username={username} avatar={avatar} r={r} />
        {r.spoilers ? (
          <details className="mt-4 group/sp">
            <summary className="list-none cursor-pointer inline-flex items-center gap-2 text-[13px] text-dim hover:text-ink [&::-webkit-details-marker]:hidden">
              <span className="px-2 py-[2px] rounded-full bg-card-hi border border-hair text-[11px] font-bold uppercase tracking-[.08em]">Spoilers</span>
              <span className="group-open/sp:hidden">This review gives things away. Show it anyway.</span>
              <span className="hidden group-open/sp:inline">Hide it again</span>
            </summary>
            {body}
          </details>
        ) : (
          body
        )}
        <ReviewActions likes={r.likes} comments={r.comments} title={r.title} shareHref={reviewPath(username, r.key)} className="mt-4" />
        <div className="mt-4 pt-4 border-t border-hair flex justify-end">
          <Link href={r.href} className="inline-block text-[13.5px] leading-none font-semibold text-accent no-underline hover:underline">
            Go to {r.title} →
          </Link>
        </div>
      </div>
    </>
  );
}

// A review read from the Watchlog opens over the list rather than leaving it:
// someone going through a month reads one, closes it, and carries on down
// the list where they were. The title page is one link away at the foot of
// the sheet, and the title in the row still goes straight there. On a phone
// it rises from the bottom.
export function ReviewSheet({ r, username, avatar, onClose }: { r: SheetReview; username: string; avatar?: string | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (k: KeyboardEvent) => k.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // The page behind stays put while the sheet is open.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`@${username}'s review of ${r.title}`} className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-[600px] max-h-[88vh] flex flex-col overflow-hidden rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl" onClick={(x) => x.stopPropagation()}>
        <ReviewSheetCard r={r} username={username} avatar={avatar} onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}

/** "23 Sept 2026" for "2026-09-23". */
function shortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// The top of a review, in the sheet and on the Reviews tab alike. On the
// left, who wrote it (their photo, then their name), the title, for a
// series the episode, and the stars; on the right, the date level with the
// byline. Whether it was a rewatch is in the byline's verb.
export function ReviewHeading({
  username,
  avatar,
  r,
  titleHref,
  hideTitle = false,
}: {
  username: string;
  avatar?: string | null;
  r: { title: string; year: string; episodes?: string; episodeTitle?: string; date: string | null; rating: number | null; rewatch?: boolean };
  titleHref?: string;
  /** On the title's own page the title is already the page's heading. */
  hideTitle?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[13px] leading-none text-dim">
          {/* Their photo, or their initial on the accent when they have none,
              as the profile draws it. */}
          <Link href={`/u/${username}`} className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-accent-fill text-on-accent border border-hair flex items-center justify-center display text-[15px] leading-none no-underline" aria-hidden tabIndex={-1}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="pt-[2px]">{username[0]?.toUpperCase()}</span>
            )}
          </Link>
          <span className="truncate">
            <Link href={`/u/${username}`} className="text-ink font-semibold no-underline hover:text-accent">
              @{username}
            </Link>{" "}
            {r.rewatch ? "rewatched" : "watched"}
          </span>
        </div>
        <h3 className={hideTitle ? "sr-only" : "!mt-2 !text-[clamp(26px,2.4vw,34px)] !leading-[.95]"}>
          {titleHref ? (
            <Link href={titleHref} className="no-underline text-ink hover:text-accent transition-colors">
              {r.title}
            </Link>
          ) : (
            r.title
          )}{" "}
          <span className="text-dim !text-[0.6em] tracking-normal">{r.year}</span>
        </h3>
        {/* For a series, the episode sits under the show's name, the way a
            TV guide sets it. */}
        {r.episodes && <EpisodeLine episode={r.episodes} name={r.episodeTitle} />}
        {/* The stars under the title (and episode), so a long title has the
            card's width to run across. */}
        {r.rating != null && (
          <div className="mt-2.5 flex">
            <RatingMarks value={r.rating} size={12} />
          </div>
        )}
      </div>
      <div className="shrink-0 flex flex-col items-end">
        {/* As tall as the byline's photo, so the date sits level with the name. */}
        <span className="h-7 flex items-center text-dim text-[12.5px] leading-none">{r.date ? shortDate(r.date) : ""}</span>
      </div>
    </div>
  );
}

/** "S2 E4 · Woe's Hollow": a series review's episode, under the show's name. */
export function EpisodeLine({ episode, name }: { episode: string; name?: string }) {
  return (
    <div className="mt-2 text-[13px] leading-none text-dim">
      <b className="text-ink font-semibold">{episode}</b>
      {name && <> · {name}</>}
    </div>
  );
}
