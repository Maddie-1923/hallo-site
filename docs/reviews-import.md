# Reviews in the library, and importing them (2 Oct 2026)

One spec for the website (`kodigo-site`), iOS (`kodigo`) and Android
(`kodigo-android`). Decided with Laura on 2 Oct 2026:

- Import written reviews and comments from **Letterboxd, TV Time and Trakt**.
  Serializd has no export (only a private API), so it waits until it ships one.
- Imported reviews are **public, quietly**: on the profile and title pages,
  dated as written, never in followers' feeds or the weekly digest.
- **Website and both apps**: the apps gain reviews (keep, sync, write, import).

## 1. The archive

`reviews` already exists on the web (`src/lib/archive.ts`):

```ts
reviews?: Record<string, Review>   // keys "movie:ID" | "show:ID" | "episode:SHOWID-S-E"
interface Review {
  text: string;            // plain text, trimmed, at most 10,000 characters
  watchedOn?: string;      // "YYYY-MM-DD", the day it was watched, when known
  rewatch?: boolean;       // absent = false
  spoilers?: boolean;      // absent = false
  modified: string;        // ISO-8601 UTC, no fractional seconds ("2026-10-02T09:15:00Z"); when written
  source?: string;         // NEW, optional: "letterboxd" | "tvtime" | "trakt" when imported
}
```

New top-level key: `importedAt?: string`, the same ISO form, the time of the
most recent import. Merging two archives keeps the later of the two.

**Every client must keep both keys through decode → encode → merge → push.**
Today both apps drop `reviews` (typed decode, unknown keys lost), which would
wipe web reviews on the next phone sync. That is the first thing to fix.

Merge of `reviews` (same as `mergeReviews` in `src/lib/imports/merge.ts`): per
key, the review with the later `modified` wins; on a tie the incoming side
wins. No tombstones (as on the web).

Reviews are separate from `notes`: a note is private, a review is public.
"Your take" in the apps keeps its private note and gains the review.

## 2. What the apps' "Your take" gains

On show, film and episode pages, under rating and moods: a **Review** field
(multi-line text, saves on blur like the note, empty removes the review) and a
**Contains spoilers** switch. Saving writes `reviews[key] = { text, spoilers?,
modified: now, watchedOn: existing value kept or today for a film marked
watched }`. The private **Note** stays as it is, below, labelled as private.
Strings go in the localisation files with comments, as the apps do now.

## 3. Importing

Imported rows carry an optional review: `{ text, writtenAt (date|null),
spoilers, rewatch, source }`, attached to the row's title (film, show or
episode) and resolved to TMDB exactly as the row's rating would be.

**Cleaning the text** (all sources): HTML `<br>`, `</p>` and `<p>` become line
breaks, other tags are dropped, entities decoded (`&amp; &lt; &gt; &quot;
&#39; &nbsp;` and numeric); Trakt's `[spoiler]…[/spoiler]` tags are removed
(keeping their contents) and set `spoilers`; runs of 3+ newlines collapse to 2;
trim. Empty after cleaning: skip.

**Several texts for one key** (TV Time comment threads, a Letterboxd film
reviewed twice): oldest first, joined with a blank line, cut at 10,000
characters. `modified` = newest `writtenAt` (else import time); `spoilers` /
`rewatch` = any; `watchedOn` = the newest watch date among those rows, if any.

**Never overwrite**: a key that already has a review in the library is left
alone and counted as "kept". Running the same import twice changes nothing.

**Every import stamps `importedAt`** with the import time (also imports with
only ratings or history, and restoring a Kodigo backup). The database uses it
to keep that write's changes out of feeds (`supabase/migrations/
20261002100000_quiet_imports.sql`).

### Letterboxd (ZIP, `reviews.csv`)

Header: `Date,Name,Year,Letterboxd URI,Rating,Rewatch,Review,Tags,Watched Date`.
`Review` → text; `Date` → writtenAt; `Watched Date` → the row's watch date;
`Rewatch` "Yes" → rewatch. Films only. Read only the top-level `reviews.csv`:
skip `deleted/` and `orphaned/`. Skip `comments.csv` and `likes/reviews.csv`
(comments on other people's posts, which don't exist on Kodigo). Text may hold
raw newlines inside quotes and HTML tags. No spoiler flag in the export.
The existing `letterboxd.diary` preset already matches `reviews.csv` for
history and ratings; add the review on top.

### Trakt (ZIP of JSON, `comments-{movies|shows|seasons|episodes}[-N].json`)

Each file is an array of
`{ type, movie?|show?, season?, episode?, comment: { comment, spoiler, review, parent_id, created_at } }`
with ids `{ trakt, slug, imdb, tmdb, tvdb }` on the movie/show/episode. Only
`parent_id == 0` (top level; replies are to other people). `comment.comment` →
text, `spoiler` (or inline spoiler tags) → spoilers, `created_at` → writtenAt.
Movie → film; show → show; episode → episode (season + number); **season →
the show, text prefixed "Season N: "**. Skip `comments-lists*`.

### TV Time (GDPR ZIP)

Shows are TheTVDB ids; films only names.

- `episode_comment.csv`: `tv_show_id, tv_show_name, episode_season_number,
  episode_number, comment, created_at, spoiler_count` → episode review.
- `show_comment.csv`: `tv_show_id, tv_show_name, comment, created_at,
  spoiler_count` → show review.
- `comments-prod-comments.csv`: `text`, `type` (skip "like"), `entity_type`,
  `series_id`/`s_id`, `series_name`, `movie_name`, season/episode numbers when
  present, `created_at`, `is_spoiler`/`spoiler_count`. Episode → episode
  review; series → show review; movie → film review by name.

Column names are inferred from parsers, not a real file (TV Time shut down on
15 July 2026): read them through the reader's existing many-spellings column
lookup, and report unknown headers in the diagnostics as the reader does now.
`spoiler_count > 0` or `is_spoiler` true → spoilers.

### What the person sees

The import summary gains "N reviews" (and "N kept, already reviewed here"
when non-zero). The preview of a picked file counts reviews found.

## 4. Tests

For each client, unit tests with inline fixtures: archive round-trip keeps
`reviews` and `importedAt`; merge rule; text cleaning; each of the three
readers (Letterboxd reviews.csv with a quoted multi-line review and HTML,
skipping deleted/; Trakt comments with a reply skipped, a season prefix and a
spoiler tag; TV Time episode and show comments); combining two texts for one
key; never overwriting an existing review.
