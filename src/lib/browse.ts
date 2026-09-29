// Browse: films or series with filters that stack, each combination at its
// own address so it can be shared and found by search engines, as
// /browse/series/genre/drama/on/netflix/sort/rated. The address is the
// filters; this file turns one into the other.
export type Kind = "films" | "series";
export type Sort = "popular" | "rated" | "new" | "alltime";

export interface Filters {
  kind: Kind;
  genre?: string; // slug
  decade?: string; // "1990s"
  on?: string[]; // service slugs
  sort: Sort;
  network?: string; // slug, series only
  status?: "airing" | "ended" | "cancelled"; // series only
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const GENRES: Record<Kind, [number, string][]> = {
  films: [
    [28, "Action"], [12, "Adventure"], [16, "Animation"], [35, "Comedy"], [80, "Crime"], [99, "Documentary"], [18, "Drama"], [10751, "Family"], [14, "Fantasy"], [36, "History"],
    [27, "Horror"], [10402, "Music"], [9648, "Mystery"], [10749, "Romance"], [878, "Science Fiction"], [10770, "TV Movie"], [53, "Thriller"], [10752, "War"], [37, "Western"],
  ],
  series: [
    [10759, "Action & Adventure"], [16, "Animation"], [35, "Comedy"], [80, "Crime"], [99, "Documentary"], [18, "Drama"], [10751, "Family"], [10762, "Kids"], [9648, "Mystery"],
    [10763, "News"], [10764, "Reality"], [10765, "Sci-Fi & Fantasy"], [10766, "Soap"], [10767, "Talk"], [10768, "War & Politics"], [37, "Western"],
  ],
};

/** The networks a series can be browsed by (TMDB's ids). */
export const NETWORKS: [number, string][] = [
  [49, "HBO"], [213, "Netflix"], [2552, "Apple TV+"], [2739, "Disney+"], [1024, "Prime Video"], [453, "Hulu"], [174, "AMC"], [88, "FX"], [4, "BBC One"], [332, "BBC Two"],
  [67, "Showtime"], [4330, "Paramount+"], [3353, "Peacock"], [3186, "Max"], [6, "NBC"], [2, "ABC"], [16, "CBS"], [19, "FOX"], [318, "Starz"], [26, "Channel 4"],
];

export const DECADES = ["2020s", "2010s", "2000s", "1990s", "1980s", "1970s", "1960s", "1950s"];

export const SORTS: [Sort, string][] = [
  ["popular", "Popular now"],
  ["rated", "Highest rated"],
  ["new", "Newest"],
  ["alltime", "All-time favourites"],
];

export const STATUSES: [NonNullable<Filters["status"]>, string][] = [
  ["airing", "Still airing"],
  ["ended", "Ended"],
  ["cancelled", "Cancelled"],
];

/** /browse/<kind>/<key>/<value>/… into filters. */
export function parse(segments: string[] = []): Filters {
  const [k, ...rest] = segments.map(decodeURIComponent);
  const f: Filters = { kind: k === "series" ? "series" : "films", sort: "popular" };
  for (let i = 0; i + 1 < rest.length; i += 2) {
    const [key, v] = [rest[i], rest[i + 1]];
    if (key === "genre") f.genre = v;
    else if (key === "decade" && DECADES.includes(v)) f.decade = v;
    else if (key === "on") f.on = v.split("+").filter(Boolean);
    else if (key === "sort" && SORTS.some(([s]) => s === v)) f.sort = v as Sort;
    else if (key === "network" && f.kind === "series") f.network = v;
    else if (key === "status" && f.kind === "series" && STATUSES.some(([s]) => s === v)) f.status = v as Filters["status"];
  }
  return f;
}

/** Filters into their address. */
export function path(f: Filters): string {
  const parts = ["/browse", f.kind];
  if (f.genre) parts.push("genre", f.genre);
  if (f.decade) parts.push("decade", f.decade);
  if (f.on?.length) parts.push("on", f.on.join("+"));
  if (f.kind === "series" && f.network) parts.push("network", f.network);
  if (f.kind === "series" && f.status) parts.push("status", f.status);
  if (f.sort !== "popular") parts.push("sort", f.sort);
  return parts.join("/");
}

/** A genre's browse address from a title page ("Sci-Fi & Fantasy" on a series). */
export function genreHref(kind: "movie" | "show", name: string) {
  return path({ kind: kind === "show" ? "series" : "films", genre: slug(name), sort: "popular" });
}
