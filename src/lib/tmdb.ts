import "server-only";
import type { Movie, Show } from "./archive";

// Server-side TMDB client. The key never reaches the browser; every page that
// draws TMDB data is a Server Component or a route handler. Responses are
// cached for an hour through Next's fetch cache, which is what keeps a
// Discover page from costing forty requests per visitor.

// Overridable so the pages can be exercised against a local stand-in where
// TMDB itself is unreachable; production never sets it.
const BASE = process.env.TMDB_BASE_URL ?? "https://api.themoviedb.org/3";

async function tmdb<T>(path: string, params: Record<string, string | number | undefined> = {}, revalidate = 3600): Promise<T | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  const url = new URL(BASE + path);
  url.searchParams.set("api_key", key);
  url.searchParams.set("include_adult", "false");
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) {
      if (process.env.TMDB_DEBUG) console.error("tmdb", path, res.status);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    if (process.env.TMDB_DEBUG) console.error("tmdb", path, e);
    // A failed rail costs that rail and nothing else, the same rule the app
    // follows for TMDB.
    return null;
  }
}

// ---- Raw shapes (only the fields we read) ----

interface RawShow {
  id: number;
  name: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string | null;
  vote_average?: number | null;
  overview?: string | null;
  status?: string | null;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  tagline?: string | null;
  type?: string | null;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: RawSeason[];
  credits?: { cast: RawPerson[] };
  external_ids?: { imdb_id?: string | null };
  networks?: { name: string }[];
  next_episode_to_air?: RawEpisode | null;
  last_episode_to_air?: RawEpisode | null;
  media_type?: string;
}

interface RawMovie {
  id: number;
  title: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  vote_average?: number | null;
  overview?: string | null;
  runtime?: number | null;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  tagline?: string | null;
  credits?: { cast: RawPerson[] };
  media_type?: string;
}

export interface RawSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date?: string | null;
  poster_path?: string | null;
  overview?: string | null;
  episodes?: RawEpisode[];
}

export interface RawEpisode {
  id: number;
  season_number: number;
  episode_number: number;
  name: string;
  air_date?: string | null;
  overview?: string | null;
  runtime?: number | null;
  still_path?: string | null;
}

export interface RawPerson {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
}

interface PageOf<T> {
  page: number;
  results: T[];
  total_pages: number;
}

// ---- Normalisers to the archive's Show / Movie ----
//
// Exactly the keys the Swift structs decode, so a title tracked from the web
// round-trips into the app without a field it didn't expect. The detail
// endpoint says `genres` where the list endpoints say `genre_ids`; both fold
// into genre_ids here.

export function toShow(r: RawShow): Show {
  return {
    id: r.id,
    name: r.name,
    poster_path: r.poster_path ?? null,
    backdrop_path: r.backdrop_path ?? null,
    first_air_date: r.first_air_date ?? null,
    vote_average: r.vote_average ?? null,
    overview: r.overview ?? null,
    status: r.status ?? null,
    genre_ids: r.genre_ids ?? r.genres?.map((g) => g.id) ?? null,
  };
}

export function toMovie(r: RawMovie): Movie {
  return {
    id: r.id,
    title: r.title,
    poster_path: r.poster_path ?? null,
    backdrop_path: r.backdrop_path ?? null,
    release_date: r.release_date ?? null,
    vote_average: r.vote_average ?? null,
    overview: r.overview ?? null,
    runtime: r.runtime ?? null,
    genre_ids: r.genre_ids ?? r.genres?.map((g) => g.id) ?? null,
  };
}

const today = () => new Date().toISOString().slice(0, 10);

async function showPage(path: string, params: Record<string, string | number> = {}) {
  const page = await tmdb<PageOf<RawShow>>(path, params);
  return page?.results.filter((r) => r.poster_path).map(toShow) ?? [];
}
async function moviePage(path: string, params: Record<string, string | number> = {}) {
  const page = await tmdb<PageOf<RawMovie>>(path, params);
  return page?.results.filter((r) => r.poster_path).map(toMovie) ?? [];
}

// ---- Rails, matching the app's Discover tab ----

export const showRails = {
  trending: () => showPage("/trending/tv/week"),
  popular: () => showPage("/tv/popular"),
  topRated: () => showPage("/tv/top_rated"),
  airingNow: () => showPage("/tv/on_the_air"),
  upcoming: () =>
    showPage("/discover/tv", { "first_air_date.gte": today(), sort_by: "popularity.desc", "vote_count.gte": 0 }),
};

export const movieRails = {
  trending: () => moviePage("/trending/movie/week"),
  popular: () => moviePage("/movie/popular"),
  topRated: () => moviePage("/movie/top_rated"),
  nowPlaying: () => moviePage("/movie/now_playing"),
  upcoming: () => moviePage("/movie/upcoming"),
};

// ---- Search ----

export type SearchHit = { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };

export async function searchTitles(query: string, page = 1): Promise<SearchHit[]> {
  const res = await tmdb<PageOf<RawShow | RawMovie>>("/search/multi", { query, page }, 300);
  if (!res) return [];
  const hits: SearchHit[] = [];
  for (const r of res.results) {
    if (r.media_type === "tv") hits.push({ kind: "show", show: toShow(r as RawShow) });
    else if (r.media_type === "movie") hits.push({ kind: "movie", movie: toMovie(r as RawMovie) });
  }
  return hits;
}

// ---- Detail ----

export interface ShowDetail {
  show: Show;
  tagline: string | null;
  type: string | null;
  seasons: RawSeason[];
  seasonCount: number;
  episodeCount: number;
  cast: RawPerson[];
  networks: string[];
  imdbID: string | null;
  nextEpisode: RawEpisode | null;
  lastEpisode: RawEpisode | null;
  genres: string[];
}

export async function showDetail(id: number): Promise<ShowDetail | null> {
  const r = await tmdb<RawShow>(`/tv/${id}`, { append_to_response: "credits,external_ids" });
  if (!r) return null;
  return {
    show: toShow(r),
    tagline: r.tagline ?? null,
    type: r.type ?? null,
    // Specials are season 0 on TMDB; the app lists them last, and so do we.
    seasons: (r.seasons ?? []).filter((s) => s.season_number > 0).concat((r.seasons ?? []).filter((s) => s.season_number === 0)),
    seasonCount: r.number_of_seasons ?? 0,
    episodeCount: r.number_of_episodes ?? 0,
    cast: r.credits?.cast.slice(0, 12) ?? [],
    networks: r.networks?.map((n) => n.name) ?? [],
    imdbID: r.external_ids?.imdb_id ?? null,
    nextEpisode: r.next_episode_to_air ?? null,
    lastEpisode: r.last_episode_to_air ?? null,
    genres: r.genres?.map((g) => g.name) ?? [],
  };
}

export async function seasonEpisodes(showID: number, season: number): Promise<RawEpisode[]> {
  const r = await tmdb<RawSeason>(`/tv/${showID}/season/${season}`);
  return r?.episodes ?? [];
}

export interface MovieDetail {
  movie: Movie;
  tagline: string | null;
  cast: RawPerson[];
  genres: string[];
}

export async function movieDetail(id: number): Promise<MovieDetail | null> {
  const r = await tmdb<RawMovie>(`/movie/${id}`, { append_to_response: "credits" });
  if (!r) return null;
  return {
    movie: toMovie(r),
    tagline: r.tagline ?? null,
    cast: r.credits?.cast.slice(0, 12) ?? [],
    genres: r.genres?.map((g) => g.name) ?? [],
  };
}

const IMG = process.env.NEXT_PUBLIC_TMDB_IMAGE_URL ?? "https://image.tmdb.org/t/p";

export const image = {
  poster: (p: string | null | undefined, size = "w342") => (p ? `${IMG}/${size}${p}` : null),
  backdrop: (p: string | null | undefined) => (p ? `${IMG}/w1280${p}` : null),
  /** The profile banner, which spans the window — w1280 upscales visibly on a big display. */
  banner: (p: string | null | undefined) => (p ? `${IMG}/original${p}` : null),
  profile: (p: string | null | undefined) => (p ? `${IMG}/w185${p}` : null),
  still: (p: string | null | undefined) => (p ? `${IMG}/w300${p}` : null),
};

// TMDB's genre ids, TV and film together. The list endpoints only carry ids,
// and a hero line that says "Drama · Crime" beats a second request per rail.
const GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary",
  18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Science Fiction", 10770: "TV Movie", 53: "Thriller",
  10752: "War", 37: "Western", 10759: "Action & Adventure", 10762: "Kids", 10763: "News",
  10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

export function genreNames(ids: number[] | null | undefined, limit = 3) {
  return (ids ?? []).map((id) => GENRES[id]).filter(Boolean).slice(0, limit);
}
