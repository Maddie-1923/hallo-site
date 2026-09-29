// Reading an export in the browser for Settings, Import & export: what the
// file is and what's in it, as the app's import tells you before it writes
// anything. Nothing is uploaded. Bringing it into the library comes with
// accounts.
import { isArchive, type LibraryArchive } from "./archive";

export interface ImportSummary {
  file: string;
  source: string;
  /** What was found, as label and count. */
  counts: [string, number][];
  /** Anything the reader couldn't use, in a sentence. */
  note?: string;
}

/** Splits a CSV into rows of cells, honouring quotes. */
function csv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
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

export async function readImport(f: File): Promise<ImportSummary> {
  const name = f.name.toLowerCase();
  if (name.endsWith(".zip")) return { file: f.name, source: "A zip file", counts: [], note: "Unzip it first, then pick the files inside (the CSV or JSON files)." };
  const text = await f.text();
  if (name.endsWith(".json")) {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { file: f.name, source: "Unreadable", counts: [], note: "This file isn't valid JSON." };
    }
    if (isArchive(data)) return kodigo(data, f.name);
    if (Array.isArray(data)) {
      const first = (data[0] ?? {}) as Record<string, unknown>;
      if ("show" in first || "movie" in first || "episode" in first) {
        const shows = data.filter((x) => (x as Record<string, unknown>).show).length;
        const films = data.filter((x) => (x as Record<string, unknown>).movie).length;
        return { file: f.name, source: "Trakt export", counts: [["Show entries", shows], ["Film entries", films]].filter(([, n]) => (n as number) > 0) as [string, number][] };
      }
    }
    const o = data as Record<string, unknown>;
    if (o && (Array.isArray(o.shows) || Array.isArray(o.movies) || Array.isArray(o.anime))) {
      return {
        file: f.name,
        source: "Simkl export",
        counts: [
          ["Shows", Array.isArray(o.shows) ? o.shows.length : 0],
          ["Films", Array.isArray(o.movies) ? o.movies.length : 0],
          ["Anime", Array.isArray(o.anime) ? o.anime.length : 0],
        ].filter(([, n]) => (n as number) > 0) as [string, number][],
      };
    }
    return { file: f.name, source: "Unknown JSON", counts: [], note: "Kodigo couldn't tell which app this came from." };
  }
  if (name.endsWith(".csv")) {
    const rows = csv(text);
    const head = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
    const n = Math.max(0, rows.length - 1);
    const has = (...cols: string[]) => cols.every((c) => head.includes(c));
    if (has("letterboxd uri")) {
      const kind = name.includes("rating") ? "Ratings" : name.includes("review") ? "Reviews" : name.includes("diary") ? "Diary entries" : name.includes("watchlist") ? "Watchlist films" : "Films watched";
      return { file: f.name, source: "Letterboxd export", counts: [[kind, n]] };
    }
    if (has("const", "your rating")) return { file: f.name, source: "IMDb ratings", counts: [["Ratings", n]] };
    if (has("const") && head.includes("title type")) return { file: f.name, source: "IMDb list", counts: [["Titles", n]] };
    if (head.some((h) => h.startsWith("tv_show") || h.startsWith("episode_") || h === "series_name")) return { file: f.name, source: "TV Time export", counts: [["Rows", n]] };
    if (head.some((h) => h.includes("simkl"))) return { file: f.name, source: "Simkl export", counts: [["Titles", n]] };
    if (head.some((h) => h.includes("trakt"))) return { file: f.name, source: "Trakt export", counts: [["Rows", n]] };
    return { file: f.name, source: "Unknown CSV", counts: [["Rows", n]], note: "Kodigo couldn't tell which app this came from." };
  }
  return { file: f.name, source: "Not an export", counts: [], note: "Pick the CSV or JSON files your old app exported, or a Kodigo backup." };
}
