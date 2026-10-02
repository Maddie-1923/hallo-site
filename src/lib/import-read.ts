// Reading an export in the browser for Settings, Import & export: what the
// file is and what's in it, as the app's import tells you before it writes
// anything, before Import reads it properly (lib/imports).
import { isArchive, type LibraryArchive } from "./archive";
import { looksLikeZip } from "./imports/zip";
import { describeImportFile, readTvTimeFiles } from "./imports";
import type { ImportedEntry } from "./imports/table";
import { isEpisode } from "./imports/table";

export interface ImportSummary {
  file: string;
  source: string;
  /** What was found, as label and count. */
  counts: [string, number][];
  /** Anything the reader couldn't use, in a sentence. */
  note?: string;
}

function kodigo(a: LibraryArchive, file: string): ImportSummary {
  const ratings = Object.keys(a.ratings ?? {}).length;
  const reviews = Object.values(a.reviews ?? {}).filter((r) => r.text?.trim()).length;
  return {
    file,
    source: "Kodigo backup",
    counts: [
      ["Shows", a.shows.length],
      ["Films", a.movies.length],
      ["Episodes watched", a.watched.length],
      ["Ratings", ratings],
      ["Reviews", reviews],
      ["Lists", (a.customLists ?? []).length],
    ],
  };
}

/** The app's name out of what the reader called the file: "Refract library" → "Refract". */
function appName(format: string): string {
  return format.replace(/\s*\(.*\)$/, "").replace(/ (library|history|ratings|episodes|favourites|diary|watched|watchlist|likes|lists|reviews|shows|movies|csv|json)$/i, "");
}

/** A title once, however many rows name it: by its id, else its folded name. */
function titleOf(e: ImportedEntry) {
  return String(e.tmdbID ?? e.imdbID ?? e.tvdbID ?? e.title.toLowerCase());
}

export async function readImport(f: File): Promise<ImportSummary> {
  const name = f.name;
  const data = new Uint8Array(await f.arrayBuffer());
  const zip = looksLikeZip(data);
  if (/\.json$/i.test(name) && !zip) {
    try {
      const parsed = JSON.parse(new TextDecoder().decode(data));
      if (isArchive(parsed)) return kodigo(parsed, name);
    } catch {
      return { file: name, source: "Unreadable", counts: [], note: "This file isn't valid JSON." };
    }
  }
  if (!zip && !/\.(csv|json|txt)$/i.test(name)) return { file: name, source: "Not an export", counts: [], note: "Pick the CSV, JSON or zip your old app exported, or a Kodigo backup." };

  // TV Time's own export first, as Import tries it first.
  if (zip || /tv.?time/i.test(name)) {
    try {
      const t = readTvTimeFiles([{ name, data }]);
      const episodes = t.shows.reduce((n, s) => n + s.episodes.length, 0);
      // A title only commented on is there for its review, not to be added.
      const series = t.shows.filter((s) => !s.onlyCommented).length;
      const films = t.movies.filter((m) => !m.onlyCommented).length;
      const reviews = t.shows.reduce((n, s) => n + s.comments.length, 0) + t.movies.reduce((n, m) => n + m.comments.length, 0);
      if (t.shows.length || t.movies.length) {
        return { file: name, source: "TV Time export", counts: ([["Series", series], ["Films", films], ["Episodes watched", episodes], ["Reviews", reviews]] as [string, number][]).filter(([, n]) => n > 0) };
      }
    } catch {}
  }

  // Everything else, read exactly as Import will read it (lib/imports).
  let parts: ReturnType<typeof describeImportFile>;
  try {
    parts = describeImportFile({ name, data });
  } catch {
    return { file: name, source: "Unreadable", counts: [], note: "This file couldn't be opened. Export it again and try once more." };
  }
  const used = parts.filter((p) => p.entries.length > 0);
  if (!used.length) return { file: name, source: zip ? "A zip file" : "Unknown file", counts: [], note: zip ? "Nothing inside looked like a watch history." : "Kodigo couldn't find a watch history in this file." };
  const all = used.flatMap((p) => p.entries);
  const reviews = all.filter((e) => e.review).length;
  // A row with only a review (a Trakt comment) adds no title.
  const entries = all.filter((e) => !e.reviewOnly);
  const series = new Set(entries.filter((e) => isEpisode(e) || e.kind === "shows").map(titleOf));
  const films = new Set(entries.filter((e) => !isEpisode(e) && e.kind === "movies").map(titleOf));
  const other = new Set(entries.filter((e) => !isEpisode(e) && e.kind !== "shows" && e.kind !== "movies").map(titleOf));
  const named = used.find((p) => p.format)?.format;
  return {
    file: name,
    source: named ? `${appName(named)} export` : "Another app's export",
    counts: ([["Series", series.size], ["Films", films.size], ["Titles", other.size], ["Episodes watched", entries.filter(isEpisode).length], ["Reviews", reviews]] as [string, number][]).filter(([, n]) => n > 0),
    note: zip && parts.length > 1 ? `${parts.length} files inside, ${used.length} with history or reviews in them.` : named || zip ? undefined : "Kodigo couldn't tell which app this came from, so it read the columns.",
  };
}
