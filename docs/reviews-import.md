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

## 5. More sources and any file with these columns (added 2 Oct 2026)

Laura: reviews, comments and moods must carry over whenever an export has the
columns, tied to the right film, show or episode.

### Refract (ZIP with `readable/*.csv` and the same data in `data/*.jsonl`)

Read the CSVs (or the JSONL when the CSV is missing; never both, so nothing
doubles).

- `reviews.csv`: `title,year,media_type,tmdb_id,target_type,target_id,season,
  episode,body,is_spoiler,visibility,source,imported,created_at,edited_at`.
  `body` → text; `is_spoiler` true → spoilers; `created_at` → writtenAt (or
  `edited_at` when later); `tmdb_id` + `media_type` place the title exactly,
  `season`/`episode` (or `target_type` episode) make it an episode review.
  `visibility` private (or anything other than public/followers/empty) →
  the text becomes the title's **private note** instead of a review.
- `vibes.csv`: `title,year,media_type,tmdb_id,target_type,target_id,
  mood_tags,created_at,updated_at` → **moods** on that title (see mapping).
- `comments.csv` (`target_type,target_id,body,…`): replies on other people's
  posts; skip, unless `target_type` is movie/show/episode, then a review.
- `reactions.csv`, `posts.csv`: skip.

### Bingers (`ratings.csv`: `type,title,tvdb_id,tmdb_id,season_number,
episode_number,rating,favorite_character,emotions`)

`emotions` → **moods** on that title or episode (mapping below).
`favorite_character` has no place in Kodigo: skip.

### Moods

Kodigo's twelve (raw values as in the archive): lovedIt, hatedIt, likedIt, sad,
onEdge, boring, frustrated, disappointed, hot, shocked, scared, confused. Map
tags case-insensitively, split on `,` `;` `|` `/`, by these words (and their
obvious forms): loved/love/amazing/favourite/masterpiece → lovedIt;
hated/hate/awful/terrible → hatedIt; liked/like/good/enjoyed/fun → likedIt;
sad/cried/crying/heartbroken/emotional/tearjerker → sad; tense/on edge/
suspense/anxious/nervous/thrilling → onEdge; boring/bored/slow/dull → boring;
frustrated/annoying/angry/infuriating → frustrated; disappointed/let down/
meh → disappointed; hot/sexy/steamy/attractive → hot; shocked/shocking/
mind-blown/mindblown/twist/wow → shocked; scared/scary/creepy/terrifying/
horror → scared; confused/confusing/lost/weird → confused. Emoji: 😍❤️→lovedIt,
😡🤬→hatedIt, 🙂😊👍→likedIt, 😭😢→sad, 😬🫣→onEdge, 🥱😴→boring, 😤→frustrated,
😞😕→disappointed, 🥵🔥❤️‍🔥→hot, 🤯→shocked, 😨👻😱→scared (as the app's own mood grid draws them), 🤔😵‍💫🙃→confused.
Unknown tags are skipped. At most 3 moods per title (the app's cap), first
three distinct in file order. Only where the title has no moods yet (never
overwrite). Count them in the summary ("N moods").

### Any other export (the column guesser)

When a file isn't recognised and its columns are guessed, these columns are
also read, by name (case and punctuation folded):

- review / reviews / review text / comment / comments / body / my review →
  review text.
- note / notes / memo / private note / private notes → the private note
  (only where none is set).
- spoiler / spoilers / is spoiler / contains spoilers / has spoilers → spoilers.
- mood / moods / vibe / vibes / emotion / emotions / tags only if every value
  maps to a mood → moods.
- review date / reviewed / reviewed at / created at / written → writtenAt.

A row whose only content is a review (no watch date or status) places the
review but doesn't add or tick the title (as for Trakt comments).

### Tests

Refract reviews (movie, episode, a private one → note), vibes → moods (with an
unknown tag skipped and the 3 cap), Bingers emotions → moods, a generic CSV
with Review, Notes, Spoiler and Mood columns, and never overwriting moods or
notes.
