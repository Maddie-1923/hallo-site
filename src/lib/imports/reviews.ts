import type { LibraryArchive, Review } from "../archive";
import { canonicalDate, formatSwiftDate, parseSwiftDate } from "./swift";

// Reviews brought over from another app — Letterboxd's `reviews.csv`, Trakt's
// comments, TV Time's comment files, Refract's reviews, a review column in any
// file — and the rules every reader shares for
// them, which the apps follow too (docs/reviews-import.md): how the text is
// cleaned, how several texts for one title become one review, and that a
// title already reviewed here keeps its own.
//
// An imported review is public, as any review is. The database keeps it out
// of followers' feeds because the write that brings it stamps `importedAt`
// (see `applyImportPlan`).

/** The longest a review is kept, in UTF-16 units as everything here counts them. */
export const REVIEW_LIMIT = 10_000;

/** The apps a review can be imported from — what `Review.source` says. */
export type ReviewSource = "letterboxd" | "tvtime" | "trakt" | "refract";

/** A review as a reader found it, riding on its row until the row's title is known. */
export interface ImportedReview {
  /** Already cleaned (`cleanReviewText`) and never empty. */
  text: string;
  /** When the other app says it was written, or null where it doesn't say. */
  writtenAt: Date | null;
  spoilers: boolean;
  rewatch: boolean;
  /** Null for a file nobody recognised, whose app isn't known. */
  source: ReviewSource | null;
}

/** One text waiting to be placed, with the night its row says the title was watched. */
export interface ReviewPiece {
  review: ImportedReview;
  watchedAt: Date | null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * Somebody's review as plain text. Letterboxd writes HTML, Trakt wraps
 * spoilers in `[spoiler]` tags, and either would otherwise show its markup
 * on the page. Paragraphs and line breaks become line breaks, every other
 * tag goes, entities are decoded (after the tags are gone, so a review that
 * wrote `&lt;b&gt;` keeps it as text), and a spoiler tag goes but its
 * contents stay and the review is marked as holding spoilers. Empty means
 * there was nothing to keep.
 */
export function cleanReviewText(raw: string): { text: string; spoilers: boolean } {
  let spoilers = false;
  let text = raw.replace(/\r\n?/g, "\n");
  text = text.replace(/\[\/?spoiler\]/gi, () => {
    spoilers = true;
    return "";
  });
  text = text.replace(/<br\s*\/?>|<\/?p(?:\s[^>]*)?>/gi, "\n");
  // A tag is a `<` with a letter after it. "a < b" is a sentence, not markup.
  text = text.replace(/<\/?[a-z][^>]*>/gi, "");
  text = text.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-z]+);/g, (whole, name: string) => {
    if (name[0] !== "#") return ENTITIES[name] ?? whole;
    const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    const valid = code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff);
    return valid ? String.fromCodePoint(code) : whole;
  });
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text, spoilers };
}

/** At most the limit, never ending on half of a surrogate pair. A private note is held to it too. */
export function cut(text: string): string {
  if (text.length <= REVIEW_LIMIT) return text;
  let out = text.slice(0, REVIEW_LIMIT);
  const last = out.charCodeAt(out.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) out = out.slice(0, -1);
  return out.trimEnd();
}

/** Undated first, in the order read; then oldest first. */
function byWritten(a: ReviewPiece, b: ReviewPiece) {
  const at = a.review.writtenAt?.getTime();
  const bt = b.review.writtenAt?.getTime();
  if (at === undefined || bt === undefined) return at === undefined ? (bt === undefined ? 0 : -1) : 1;
  return at - bt;
}

/**
 * Every text for one title as the one review a title has — a TV Time comment
 * thread, a Letterboxd film reviewed twice. Oldest first with a blank line
 * between (the same text twice only once), cut at the limit; dated by the
 * newest of them, else `importedAt`; spoilers or a rewatch if any of them
 * says so; watched on the newest night among their rows.
 */
export function combineReviews(pieces: ReviewPiece[], importedAt: string): Review {
  const ordered = [...pieces].sort(byWritten);
  const texts: string[] = [];
  for (const p of ordered) if (!texts.includes(p.review.text)) texts.push(p.review.text);
  const written = pieces.flatMap((p) => (p.review.writtenAt ? [p.review.writtenAt.getTime()] : []));
  const watched = pieces.flatMap((p) => (p.watchedAt ? [p.watchedAt.getTime()] : []));
  const source = ordered[ordered.length - 1].review.source;

  // Absent rather than false, as a review written here leaves them.
  return {
    text: cut(texts.join("\n\n")),
    ...(watched.length > 0 ? { watchedOn: new Date(Math.max(...watched)).toISOString().slice(0, 10) } : {}),
    ...(pieces.some((p) => p.review.rewatch) ? { rewatch: true } : {}),
    ...(pieces.some((p) => p.review.spoilers) ? { spoilers: true } : {}),
    modified: written.length > 0 ? formatSwiftDate(Math.max(...written)) : importedAt,
    ...(source ? { source } : {}),
  };
}

/** Files a text under its key, ready for `placeReviews`. */
export function addReviewPiece(pieces: Map<string, ReviewPiece[]>, key: string, review: ImportedReview, watchedAt: Date | null) {
  const held = pieces.get(key);
  if (held) held.push({ review, watchedAt });
  else pieces.set(key, [{ review, watchedAt }]);
}

/**
 * Each key's texts as one review in `into` — except where `library` already
 * holds a review for that key, which stands and is counted as kept. An
 * import never overwrites a review, so running one twice changes nothing.
 */
export function placeReviews(pieces: Map<string, ReviewPiece[]>, library: LibraryArchive, into: LibraryArchive, importedAt: string): { added: number; kept: number } {
  let added = 0;
  let kept = 0;
  const reviews: Record<string, Review> = {};
  for (const [key, held] of pieces) {
    if (held.length === 0) continue;
    if (library.reviews?.[key]) {
      kept++;
      continue;
    }
    reviews[key] = combineReviews(held, importedAt);
    added++;
  }
  if (added > 0) into.reviews = { ...(into.reviews ?? {}), ...reviews };
  return { added, kept };
}

const REVIEW_KEY = /^(movie|show|episode):[\d-]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Reviews arriving from the browser with an import or a backup, checked
 * before they're saved: a key of one of the three shapes, text that is a
 * string with something in it (cut at the limit), a `modified` the apps can
 * read, and every other field only when it is the type it should be. A
 * review that fails is dropped rather than repaired by guessing.
 */
export function cleanArchiveReviews(value: unknown): Record<string, Review> | undefined {
  if (!isObject(value)) return undefined;
  const out: Record<string, Review> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!REVIEW_KEY.test(key) || !isObject(raw)) continue;
    const { text, watchedOn, rewatch, spoilers, modified, source } = raw;
    if (typeof text !== "string" || !text.trim() || typeof modified !== "string" || parseSwiftDate(modified) === null) continue;
    out[key] = {
      text: cut(text.trim()),
      ...(typeof watchedOn === "string" && DAY.test(watchedOn) ? { watchedOn } : {}),
      ...(rewatch === true ? { rewatch: true } : {}),
      ...(spoilers === true ? { spoilers: true } : {}),
      modified: canonicalDate(modified),
      ...(typeof source === "string" && source ? { source } : {}),
    };
  }
  return out;
}

/**
 * Private notes arriving from the browser, checked as reviews are: a key of
 * one of the three shapes and text with something in it, cut at the limit.
 * A note is never shown to anybody else, so it doesn't meet the word filter.
 */
export function cleanArchiveNotes(value: unknown): Record<string, string> | undefined {
  if (!isObject(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, text] of Object.entries(value)) {
    if (!REVIEW_KEY.test(key) || typeof text !== "string" || !text.trim()) continue;
    out[key] = cut(text.trim());
  }
  return out;
}
