import { MOOD_IDS } from "../library-rules";
import { fold } from "./text";

// Moods brought over from another app — Refract's vibes, Bingers' emotions,
// a column of them in any file — as Kodigo's twelve (docs/reviews-import.md,
// section 5). Other apps tag freely, in words and in emoji, so a tag is
// matched by what it says rather than by spelling: "Mind-blown", "mindblown"
// and 🤯 are all Shocked. A tag nothing here recognises is skipped rather
// than guessed at.

/** Every word a mood answers to, folded (lowercase, letters and digits only). */
const WORDS: Record<string, string[]> = {
  lovedIt: ["lovedit", "loveit", "loved", "love", "loves", "loving", "amazing", "favourite", "favorite", "fave", "fav", "masterpiece"],
  hatedIt: ["hatedit", "hateit", "hated", "hate", "hates", "awful", "terrible"],
  likedIt: ["likedit", "likeit", "liked", "like", "likes", "good", "enjoyed", "enjoy", "enjoyable", "fun"],
  sad: ["sad", "cried", "cry", "crying", "heartbroken", "heartbreaking", "emotional", "tearjerker", "tearjerking"],
  onEdge: ["onedge", "tense", "tension", "suspense", "suspenseful", "anxious", "nervous", "thrilling"],
  boring: ["boring", "bored", "slow", "dull"],
  frustrated: ["frustrated", "frustrating", "annoying", "annoyed", "angry", "infuriating", "infuriated"],
  disappointed: ["disappointed", "disappointing", "letdown", "meh"],
  hot: ["hot", "sexy", "steamy", "attractive"],
  shocked: ["shocked", "shocking", "mindblown", "mindblowing", "twist", "wow"],
  scared: ["scared", "scary", "creepy", "terrifying", "terrified", "horror"],
  confused: ["confused", "confusing", "lost", "weird"],
};

/** Every emoji a mood answers to, without the variation selector some keyboards add. */
const EMOJI: Record<string, string[]> = {
  lovedIt: ["😍", "❤"],
  hatedIt: ["😡", "🤬"],
  likedIt: ["🙂", "😊", "👍"],
  sad: ["😭", "😢"],
  onEdge: ["😬", "🫣"],
  boring: ["🥱", "😴"],
  frustrated: ["😤"],
  disappointed: ["😞", "😕"],
  // ❤️‍🔥 and 😱 as the app's own mood grid draws hot and scared.
  hot: ["🥵", "🔥", "\u2764\uFE0F\u200D\u{1F525}", "\u2764\u200D\u{1F525}"],
  shocked: ["🤯"],
  scared: ["😨", "👻", "😱"],
  confused: ["🤔", "😵‍💫", "🙃"],
};

const BY_WORD = new Map(Object.entries(WORDS).flatMap(([mood, words]) => words.map((w) => [w, mood] as const)));
const BY_EMOJI = new Map(Object.entries(EMOJI).flatMap(([mood, marks]) => marks.map((m) => [m, mood] as const)));

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const LETTER = /[\p{L}\p{N}]/u;

/** At most three moods a title carries — the app's cap. */
export const MOOD_LIMIT = 3;

/**
 * The moods in one cell of tags, in the order written, and how many tags
 * nothing recognised. Tags are split on `,` `;` `|` `/`; a tag with words in
 * it is matched by its words, and failing that by any emoji in it; one
 * without words is read emoji by emoji, so "😭🤯" is two.
 */
export function readMoodTags(cell: string): { moods: string[]; unknown: number } {
  const moods: string[] = [];
  let unknown = 0;
  const add = (mood: string) => {
    if (!moods.includes(mood)) moods.push(mood);
  };
  for (const raw of cell.split(/[,;|/]/)) {
    const tag = raw.trim();
    if (!tag) continue;
    const word = BY_WORD.get(fold(tag));
    if (word) {
      add(word);
      continue;
    }
    // No word for it: the emoji in it, if any. A tag of nothing but emoji
    // with one this doesn't know in it counts as unknown, its others kept.
    const marks = [...graphemes.segment(tag)].map((g) => g.segment.replace(/\uFE0F/g, "")).filter((g) => g.trim());
    const found = marks.map((m) => BY_EMOJI.get(m)).filter((m): m is string => m !== undefined);
    found.forEach(add);
    if (found.length === 0 || (!LETTER.test(tag) && found.length < marks.length)) unknown++;
  }
  return { moods, unknown };
}

/** The moods in a cell, unknown tags skipped. */
export function moodsIn(cell: string | null | undefined): string[] {
  return cell ? readMoodTags(cell).moods : [];
}

const MOOD_KEY = /^(movie|show|episode):[\d-]+$/;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Moods arriving from the browser with an import or a backup, checked before
 * they're saved: a key of one of the three shapes, and only the twelve raw
 * values, each once, at most three. A title left with none is dropped.
 */
export function cleanArchiveMoods(value: unknown): Record<string, string[]> | undefined {
  if (!isObject(value)) return undefined;
  const out: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!MOOD_KEY.test(key) || !Array.isArray(raw)) continue;
    const moods = [...new Set(raw.filter((m): m is string => typeof m === "string" && MOOD_IDS.includes(m)))].slice(0, MOOD_LIMIT);
    if (moods.length > 0) out[key] = moods;
  }
  return out;
}
