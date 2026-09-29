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
  credits?: { cast: RawPerson[]; crew?: { id: number; name: string; job?: string }[] };
  external_ids?: { imdb_id?: string | null };
  networks?: { name: string; logo_path?: string | null }[];
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
  credits?: { cast: RawPerson[]; crew?: { id: number; name: string; job?: string }[] };
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
  vote_average?: number;
  crew?: { id: number; name: string; job?: string }[];
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
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

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
  /** The most anticipated series still to come: not yet premiered, the most
      talked about first. */
  anticipated: () => showPage("/discover/tv", { "first_air_date.gte": tomorrow(), sort_by: "popularity.desc" }),
};

export const movieRails = {
  trending: () => moviePage("/trending/movie/week"),
  popular: () => moviePage("/movie/popular"),
  topRated: () => moviePage("/movie/top_rated"),
  // Both take the visitor's country (see region.ts): release dates differ by
  // country, and TMDB answers per region when asked.
  nowPlaying: (region?: string) => moviePage("/movie/now_playing", region ? { region } : {}),
  upcoming: (region?: string) => moviePage("/movie/upcoming", region ? { region } : {}),
  /** The most anticipated films still to come in the visitor's country: not
      yet out in cinemas there, the most talked about first. */
  anticipated: (region?: string) =>
    moviePage("/discover/movie", { "primary_release_date.gte": tomorrow(), sort_by: "popularity.desc", with_release_type: "2|3", ...(region ? { region } : {}) }),
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
  // Posters and faces are drawn on sharp (2x) screens, so each is fetched at
  // about twice the size it's shown: w780 for a poster, h632 for a face.
  poster: (p: string | null | undefined, size = "w780") => (p ? `${IMG}/${size}${p}` : null),
  backdrop: (p: string | null | undefined) => (p ? `${IMG}/w1280${p}` : null),
  /** A backdrop shown near full width — the profile banner, the Discover hero,
      the landing frame. w1280 stretched across a 1700px hero is where the
      "why do the posters look soft" comes from; `original` is the only size
      TMDB offers above it. */
  banner: (p: string | null | undefined) => (p ? `${IMG}/original${p}` : null),
  profile: (p: string | null | undefined) => (p ? `${IMG}/h632${p}` : null),
  still: (p: string | null | undefined) => (p ? `${IMG}/w780${p}` : null),
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

// ---- The home page's billboard ----

type RawVideos = { videos?: { results: { key: string; name?: string; site: string; type: string; official?: boolean; published_at?: string }[] } };

/** A title's video on YouTube, with the name the studio gave it. */
export type Video = { key: string; name: string };
type RawMovieBillboard = RawMovie & RawVideos & { release_dates?: { results: { iso_3166_1: string; release_dates: { certification: string }[] }[] } };
type RawShowBillboard = RawShow & RawVideos & { episode_run_time?: number[]; content_ratings?: { results: { iso_3166_1: string; rating: string }[] } };

/** What one billboard slide says beyond what a list endpoint carries: the
    line the studio wrote, the age rating, how long it runs, and a trailer. */
export interface Billboard {
  tagline: string | null;
  certification: string | null;
  /** "1h 52m" for a film, "45m" an episode for a show. */
  runtime: string | null;
  genres: string[];
  /** A YouTube id. */
  trailer: string | null;
}

// The visitor's own country's rating when TMDB has one, the US rating when it
// doesn't (it is the one TMDB fills most reliably), and no chip at all when
// neither exists.
const RATING_FALLBACK = "US";

function pickTrailer(v: RawVideos["videos"]): string | null {
  const yt = v?.results.filter((x) => x.site === "YouTube") ?? [];
  const best =
    yt.find((x) => x.type === "Trailer" && x.official) ??
    yt.find((x) => x.type === "Trailer") ??
    yt.find((x) => x.type === "Teaser");
  return best?.key ?? null;
}

/** Up to two trailers for a title's page: official trailers first (oldest
    first, so the first trailer leads), then any trailer, then teasers. */
function pickTrailers(v: RawVideos["videos"]): Video[] {
  const yt = (v?.results.filter((x) => x.site === "YouTube") ?? []).sort((a, b) => (a.published_at ?? "").localeCompare(b.published_at ?? ""));
  const ranked = [...yt.filter((x) => x.type === "Trailer" && x.official), ...yt.filter((x) => x.type === "Trailer" && !x.official), ...yt.filter((x) => x.type === "Teaser")];
  return ranked.slice(0, 2).map((x) => ({ key: x.key, name: x.name ?? "Trailer" }));
}

function duration(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export async function movieBillboard(id: number, region = RATING_FALLBACK): Promise<Billboard | null> {
  const r = await tmdb<RawMovieBillboard>(`/movie/${id}`, { append_to_response: "videos,release_dates" });
  if (!r) return null;
  const certIn = (c: string) =>
    r.release_dates?.results
      .find((x) => x.iso_3166_1 === c)
      ?.release_dates.map((d) => d.certification)
      .find(Boolean) ?? null;
  const cert = certIn(region) ?? certIn(RATING_FALLBACK);
  return {
    tagline: r.tagline || null,
    certification: cert,
    runtime: duration(r.runtime),
    genres: r.genres?.map((g) => g.name).slice(0, 2) ?? [],
    trailer: pickTrailer(r.videos),
  };
}

export async function showBillboard(id: number, region = RATING_FALLBACK): Promise<Billboard | null> {
  const r = await tmdb<RawShowBillboard>(`/tv/${id}`, { append_to_response: "videos,content_ratings" });
  if (!r) return null;
  const run = r.episode_run_time?.[0] ?? r.last_episode_to_air?.runtime ?? null;
  return {
    tagline: r.tagline || null,
    certification:
      r.content_ratings?.results.find((x) => x.iso_3166_1 === region)?.rating ||
      r.content_ratings?.results.find((x) => x.iso_3166_1 === RATING_FALLBACK)?.rating ||
      null,
    runtime: duration(run),
    genres: r.genres?.map((g) => g.name).slice(0, 2) ?? [],
    trailer: pickTrailer(r.videos),
  };
}

// ---- Title logos, for the home page's wide cards ----

type RawImages = { logos?: { file_path: string; iso_639_1: string | null; vote_average?: number; aspect_ratio?: number }[] };

/** The title's own logo artwork (a transparent PNG), English first, or null.
    One request per title, cached for a day, since a logo almost never changes. */
export async function titleLogo(kind: "show" | "movie", id: number): Promise<string | null> {
  const r = await tmdb<RawImages>(`/${kind === "show" ? "tv" : "movie"}/${id}/images`, { include_image_language: "en,null" }, 86400);
  const logos = r?.logos ?? [];
  const pick = logos.find((l) => l.iso_639_1 === "en") ?? logos.find((l) => l.iso_639_1 === null);
  return pick ? `${IMG}/original${pick.file_path}` : null;
}

/** A backdrop at card size: sharp at a quarter of a wide screen on a 2x
    display without fetching the full-width cut. */
export function cardBackdrop(p: string | null | undefined) {
  return p ? `${IMG}/w1280${p}` : null;
}


// ---- The credits and details tabs on a title's page ----

/** A group of the crew, as Letterboxd sets it: "Writers", and who. */
export interface CrewGroup {
  label: string;
  people: Credit[];
}

/** Studios, countries, languages and the other names it goes by. */
export interface TitleDetails {
  studios: string[];
  countries: string[];
  languages: string[];
  alternativeTitles: string[];
  imdb: string | null;
  tmdb: string;
  /** A series' networks. */
  networks?: string[];
}

/** One release: a day, where, its age rating there, and a note (a festival). */
export interface Release {
  date: string;
  country: string;
  certification: string;
  note: string;
}

/** A film's releases, by kind, in TMDB's order: premiere, limited, theatrical,
    digital, physical, TV. */
export interface ReleaseGroup {
  label: string;
  releases: Release[];
}

// The jobs worth a row, in the order Letterboxd lists them.
const CREW_GROUPS: [string, string[]][] = [
  ["Directors", ["Director"]],
  ["Creators", ["Creator"]],
  ["Writers", ["Screenplay", "Writer", "Story", "Novel", "Author", "Teleplay"]],
  ["Producers", ["Producer"]],
  ["Exec. producers", ["Executive Producer"]],
  ["Casting", ["Casting", "Casting Director"]],
  ["Editor", ["Editor"]],
  ["Cinematography", ["Director of Photography"]],
  ["Music", ["Original Music Composer", "Music", "Composer"]],
  ["Production design", ["Production Design", "Production Designer"]],
  ["Art direction", ["Art Direction"]],
  ["Set decoration", ["Set Decoration"]],
  ["Costume design", ["Costume Design", "Costume Designer"]],
  ["Makeup", ["Makeup Department Head", "Makeup Artist"]],
  ["Visual effects", ["Visual Effects Supervisor"]],
  ["Sound", ["Sound Designer", "Supervising Sound Editor"]],
];

function crewGroups(crew: { id: number; name: string; job?: string }[], creators: Credit[] = []): CrewGroup[] {
  return CREW_GROUPS.map(([label, jobs]) => {
    const people = (label === "Creators" ? creators : crew.filter((c) => c.job && jobs.includes(c.job)).map((c) => ({ id: c.id, name: c.name }))).filter(
      (c, i, a) => a.findIndex((x) => x.id === c.id) === i,
    );
    // One person is "Director", several "Directors", as a heading reads.
    const single = people.length === 1 && label.endsWith("s") && !["Exec. producers"].includes(label) ? label.slice(0, -1) : label;
    return { label: single, people };
  }).filter((g) => g.people.length > 0);
}

type RawDetails = {
  production_companies?: { name: string }[];
  production_countries?: { name: string }[];
  spoken_languages?: { english_name: string }[];
  alternative_titles?: { titles?: { title: string }[]; results?: { title: string }[] };
  external_ids?: { imdb_id?: string | null };
  imdb_id?: string | null;
  keywords?: { keywords?: { name: string }[]; results?: { name: string }[] };
};

function details(r: RawDetails, kind: "movie" | "tv", id: number, title: string): TitleDetails {
  const alt = [...(r.alternative_titles?.titles ?? []), ...(r.alternative_titles?.results ?? [])].map((t) => t.title).filter((t, i, a) => t !== title && a.indexOf(t) === i);
  const imdb = r.imdb_id ?? r.external_ids?.imdb_id ?? null;
  return {
    studios: (r.production_companies ?? []).map((c) => c.name),
    countries: (r.production_countries ?? []).map((c) => c.name),
    languages: (r.spoken_languages ?? []).map((l) => l.english_name).filter(Boolean),
    alternativeTitles: alt,
    imdb: imdb ? `https://www.imdb.com/title/${imdb}/` : null,
    tmdb: `https://www.themoviedb.org/${kind}/${id}`,
  };
}

function keywords(r: RawDetails) {
  return [...(r.keywords?.keywords ?? []), ...(r.keywords?.results ?? [])].map((k) => k.name.replace(/\b\w/g, (c) => c.toUpperCase()));
}

const RELEASE_KINDS: Record<number, string> = { 1: "Premiere", 2: "Theatrical limited", 3: "Theatrical", 4: "Digital", 5: "Physical", 6: "TV" };

function releaseGroups(r: { release_dates?: { results: { iso_3166_1: string; release_dates: { release_date: string; type: number; certification?: string; note?: string }[] }[] } }): ReleaseGroup[] {
  const by = new Map<number, Release[]>();
  for (const c of r.release_dates?.results ?? [])
    for (const d of c.release_dates) {
      const list = by.get(d.type) ?? [];
      list.push({ date: d.release_date.slice(0, 10), country: c.iso_3166_1, certification: d.certification ?? "", note: d.note ?? "" });
      by.set(d.type, list);
    }
  return [1, 2, 3, 4, 5, 6]
    .filter((t) => by.has(t))
    .map((t) => ({ label: RELEASE_KINDS[t], releases: by.get(t)!.sort((a, b) => a.date.localeCompare(b.date) || a.country.localeCompare(b.country)) }));
}

// ---- A title's own page, as the app's detail screens draw it ----

export interface Provider {
  id: number;
  name: string;
  logo: string | null;
}

/** Where to watch in one country: subscription services first, then free
    ones, and TMDB's page for that country (which hands on to JustWatch). */
export interface WhereToWatch {
  subscription: Provider[];
  free: Provider[];
  link: string | null;
  /** Every service carrying it anywhere, this country included, by name,
      each with the countries (ISO codes) that have it. The app's "Also
      streaming in" list leaves out what's carried here; the web shows it
      all, since someone on a VPN can watch from any of them. */
  elsewhere: { provider: Provider; countries: string[] }[];
}

type RawProviders = {
  "watch/providers"?: { results: Record<string, { link?: string; flatrate?: RawProvider[]; free?: RawProvider[]; ads?: RawProvider[] }> };
};
type RawProvider = { provider_id: number; provider_name: string; logo_path?: string | null };

/** What two listings of the same service share, as the app keys them:
    TMDB lists each tier apart ("Netflix Standard with Ads"), so the tier
    words are peeled off the end until the service's own name is left. */
function serviceKey(name: string) {
  let key = name.toLowerCase().trim();
  const tiers = ["with ads", "premium", "standard", "basic", "free"];
  for (let peeled = true; peeled; ) {
    peeled = false;
    for (const t of tiers)
      if (key.endsWith(" " + t)) {
        key = key.slice(0, -(t.length + 1)).trim();
        peeled = true;
      }
  }
  return key;
}

function whereToWatch(r: RawProviders, region: string): WhereToWatch | null {
  const all = r["watch/providers"]?.results ?? {};
  const one = (p: RawProvider): Provider => ({ id: p.provider_id, name: p.provider_name, logo: p.logo_path ? `${IMG}/w154${p.logo_path}` : null });
  const c = all[region];
  const subscription = (c?.flatrate ?? []).map(one);
  // The app's Free row is the ad-supported services.
  const free = (c?.ads ?? []).map(one).filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i);

  // Everywhere, this country too, service by service.
  const countries = new Map<string, Set<string>>();
  const services = new Map<string, Provider>();
  for (const [code, rc] of Object.entries(all)) {
    for (const raw of [...(rc.flatrate ?? []), ...(rc.ads ?? [])]) {
      const k = serviceKey(raw.provider_name);
      countries.set(k, (countries.get(k) ?? new Set()).add(code));
      const held = services.get(k);
      if (!held || raw.provider_name.length < held.name.length) services.set(k, one(raw));
    }
  }
  const elsewhere = [...countries.entries()]
    .map(([k, codes]) => ({ provider: services.get(k)!, countries: [...codes].sort() }))
    .sort((x, y) => x.provider.name.localeCompare(y.provider.name, undefined, { sensitivity: "base" }));

  return subscription.length || free.length || elsewhere.length ? { subscription, free, link: c?.link ?? null, elsewhere } : null;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  photo: string | null;
}

/** Someone behind a title, for its page and a link to their own. */
export interface Credit {
  id: number;
  name: string;
}

export interface FilmPage {
  movie: Movie;
  directors: Credit[];
  genres: string[];
  /** The release in the visitor's country when TMDB has one, else the film's own date. */
  released: string | null;
  trailer: string | null;
  trailers: Video[];
  cast: CastMember[];
  moreLikeThis: RailTitle[];
  watch: WhereToWatch | null;
  crew: CrewGroup[];
  details: TitleDetails;
  keywords: string[];
  releases: ReleaseGroup[];
}

type RawFilmPage = RawMovie &
  RawVideos &
  RawProviders & {
    recommendations?: { results: RawMovie[] };
    release_dates?: { results: { iso_3166_1: string; release_dates: { release_date: string; type: number; certification?: string; note?: string }[] }[] };
  } & RawDetails;

export async function filmPage(id: number, region = RATING_FALLBACK): Promise<FilmPage | null> {
  const r = await tmdb<RawFilmPage>(`/movie/${id}`, { append_to_response: "credits,videos,recommendations,watch/providers,release_dates,keywords,alternative_titles" });
  if (!r) return null;
  // The theatrical (3) or limited (2) release where the visitor is.
  const local = r.release_dates?.results
    .find((x) => x.iso_3166_1 === region)
    ?.release_dates.filter((d) => d.type === 3 || d.type === 2)
    .map((d) => d.release_date.slice(0, 10))
    .sort()[0];
  return {
    movie: toMovie(r),
    genres: r.genres?.map((g) => g.name) ?? [],
    directors: (r.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => ({ id: c.id, name: c.name })).filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i),
    released: local ?? r.release_date ?? null,
    trailer: pickTrailer(r.videos),
    trailers: pickTrailers(r.videos),
    cast: (r.credits?.cast ?? []).slice(0, 15).map((p) => ({ id: p.id, name: p.name, character: p.character ?? "", photo: image.profile(p.profile_path) })),
    moreLikeThis: (r.recommendations?.results ?? [])
      .filter((x) => x.poster_path)
      .slice(0, 15)
      .map((x) => ({ id: x.id, title: x.title, year: (x.release_date ?? "").slice(0, 4), poster: image.poster(x.poster_path, "w780") })),
    watch: whereToWatch(r, region),
    crew: crewGroups(r.credits?.crew ?? []),
    details: details(r, "movie", r.id, r.title),
    keywords: keywords(r),
    releases: releaseGroups(r),
  };
}

/** A card in a More like this rail, film or series. */
export interface RailTitle {
  id: number;
  title: string;
  year: string;
  poster: string | null;
}

export interface SeriesPage {
  show: Show;
  /** Who created the series: a series' directors change from episode to
      episode, so its creators stand where a film's director does. */
  creators: Credit[];
  type: string | null;
  genres: string[];
  seasons: RawSeason[];
  seasonCount: number;
  episodeCount: number;
  /** Minutes an episode, when TMDB says. */
  episodeRuntime: number | null;
  certification: string | null;
  lastAired: string | null;
  trailer: string | null;
  trailers: Video[];
  cast: CastMember[];
  moreLikeThis: RailTitle[];
  watch: WhereToWatch | null;
  crew: CrewGroup[];
  details: TitleDetails;
  keywords: string[];
  /** Where it premiered, season by season, and its age ratings by country. */
  airing: { networks: { name: string; logo: string | null }[]; seasons: { name: string; date: string | null; episodes: number }[]; ratings: { country: string; rating: string }[] };
}

type RawSeriesPage = RawShow &
  RawVideos &
  RawProviders & {
    episode_run_time?: number[];
    last_air_date?: string | null;
    content_ratings?: { results: { iso_3166_1: string; rating: string }[] };
    created_by?: { id: number; name: string }[];
    recommendations?: { results: RawShow[] };
    origin_country?: string[];
    aggregate_credits?: { cast: { id: number; name: string; profile_path?: string | null; roles?: { character: string }[] }[] };
  } & RawDetails;

/** A series' trailers for its page: the newest trailer it has, then each
    season's own (its official trailer, else any trailer, else a teaser),
    newest season first, none twice. */
export async function showTrailers(id: number, seasons: number[]): Promise<Video[]> {
  type Raw = { results: NonNullable<RawVideos["videos"]>["results"] };
  const best = (v: Raw["results"]) => {
    const yt = v.filter((x) => x.site === "YouTube");
    return yt.find((x) => x.type === "Trailer" && x.official) ?? yt.find((x) => x.type === "Trailer") ?? yt.find((x) => x.type === "Teaser");
  };
  const [own, ...each] = await Promise.all([
    tmdb<Raw>(`/tv/${id}/videos`),
    ...[...seasons].sort((a, b) => b - a).map((n) => tmdb<Raw>(`/tv/${id}/season/${n}/videos`).then((r) => ({ n, r }))),
  ]);
  const all = [own?.results ?? [], ...each.map((e) => (e as { r: Raw | null }).r?.results ?? [])].flat();
  const newest = all
    .filter((x) => x.site === "YouTube" && x.type === "Trailer")
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))[0];
  const out: Video[] = [];
  const add = (x: Raw["results"][number] | undefined, name?: string) => {
    if (x && !out.some((o) => o.key === x.key)) out.push({ key: x.key, name: name ?? x.name ?? "Trailer" });
  };
  add(newest);
  for (const e of each as { n: number; r: Raw | null }[]) {
    const v = e.r ? best(e.r.results) : undefined;
    // Named by its season when its own name doesn't say.
    add(v, v && !/season|s\d/i.test(v.name ?? "") ? `Season ${e.n} · ${v.name ?? "Trailer"}` : undefined);
  }
  return out.length ? out : pickTrailers(own ? { results: own.results } : undefined);
}

export async function seriesPage(id: number, region = RATING_FALLBACK): Promise<SeriesPage | null> {
  const r = await tmdb<RawSeriesPage>(`/tv/${id}`, { append_to_response: "credits,videos,recommendations,watch/providers,content_ratings,keywords,alternative_titles,external_ids" });
  if (!r) return null;
  const rating = (c: string) => r.content_ratings?.results.find((x) => x.iso_3166_1 === c)?.rating || null;
  return {
    show: toShow(r),
    creators: (r.created_by ?? []).map((c) => ({ id: c.id, name: c.name })),
    type: r.type ?? null,
    genres: r.genres?.map((g) => g.name) ?? [],
    // Specials are season 0 on TMDB; the app lists them last, and so do we.
    seasons: (r.seasons ?? []).filter((s) => s.season_number > 0).concat((r.seasons ?? []).filter((s) => s.season_number === 0)),
    seasonCount: r.number_of_seasons ?? 0,
    episodeCount: r.number_of_episodes ?? 0,
    episodeRuntime: r.episode_run_time?.[0] ?? r.last_episode_to_air?.runtime ?? null,
    certification: rating(region) ?? rating(RATING_FALLBACK),
    lastAired: r.last_air_date ?? r.last_episode_to_air?.air_date ?? null,
    trailer: pickTrailer(r.videos),
    trailers: pickTrailers(r.videos),
    cast: (r.credits?.cast ?? []).slice(0, 15).map((p) => ({ id: p.id, name: p.name, character: p.character ?? "", photo: image.profile(p.profile_path) })),
    moreLikeThis: (r.recommendations?.results ?? [])
      .filter((x) => x.poster_path)
      .slice(0, 15)
      .map((x) => ({ id: x.id, title: x.name, year: (x.first_air_date ?? "").slice(0, 4), poster: image.poster(x.poster_path, "w780") })),
    watch: whereToWatch(r, region),
    crew: crewGroups(r.credits?.crew ?? [], (r.created_by ?? []).map((c) => ({ id: c.id, name: c.name }))),
    details: { ...details(r, "tv", r.id, r.name), networks: (r.networks ?? []).map((n) => n.name) },
    keywords: keywords(r),
    airing: {
      networks: (r.networks ?? []).map((n) => ({ name: n.name, logo: n.logo_path ? `${IMG}/w154${n.logo_path}` : null })),
      seasons: (r.seasons ?? []).filter((x) => x.season_number > 0).map((x) => ({ name: x.name, date: (x as { air_date?: string | null }).air_date ?? null, episodes: x.episode_count })),
      ratings: (r.content_ratings?.results ?? []).filter((x) => x.rating).map((x) => ({ country: x.iso_3166_1, rating: x.rating })),
    },
  };
}

// ---- A person's page ----

export interface PersonCredit {
  kind: "movie" | "show";
  id: number;
  title: string;
  /** "YYYY-MM-DD", or "" when TMDB has no date yet. */
  date: string;
  poster: string | null;
  /** What they did on it: "Director", "Creator", or the character played. */
  role: string;
}

export interface PersonPage {
  id: number;
  name: string;
  photo: string | null;
  knownFor: string;
  biography: string;
  born: string | null;
  place: string | null;
  directed: PersonCredit[];
  acted: PersonCredit[];
  /** Everything else behind the camera (writing, producing, music…), one
      card a title with its jobs together. */
  crew: PersonCredit[];
}

type RawCombined = {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  job?: string;
  character?: string;
  episode_count?: number;
  popularity?: number;
};

export async function personPage(id: number): Promise<PersonPage | null> {
  const r = await tmdb<{
    id: number;
    name: string;
    profile_path?: string | null;
    known_for_department?: string;
    biography?: string;
    birthday?: string | null;
    place_of_birth?: string | null;
    combined_credits?: { cast: RawCombined[]; crew: RawCombined[] };
  }>(`/person/${id}`, { append_to_response: "combined_credits" });
  if (!r) return null;
  const one = (c: RawCombined, role: string): PersonCredit => ({
    kind: c.media_type === "tv" ? "show" : "movie",
    id: c.id,
    title: c.title ?? c.name ?? "",
    date: c.release_date ?? c.first_air_date ?? "",
    poster: image.poster(c.poster_path, "w780"),
    role,
  });
  // Newest first, with what's still to come (no date, or a date ahead) on top.
  const order = (a: PersonCredit, b: PersonCredit) => (b.date || "9999").localeCompare(a.date || "9999");
  const unique = (xs: PersonCredit[]) => xs.filter((x, i) => xs.findIndex((y) => y.kind === x.kind && y.id === x.id) === i);
  const crew = r.combined_credits?.crew ?? [];
  const directed = unique(
    crew
      .filter((c) => c.job === "Director" || c.job === "Creator" || c.job === "Series Director")
      .map((c) => one(c, c.job === "Creator" ? "Creator" : "Director")),
  ).sort(order);
  // The rest of their crew work, a title once with its jobs joined.
  const jobs = new Map<string, { c: RawCombined; jobs: string[] }>();
  for (const c of crew) {
    if (c.job === "Director" || c.job === "Creator" || c.job === "Series Director" || !c.job) continue;
    const k = `${c.media_type}${c.id}`;
    const e = jobs.get(k) ?? { c, jobs: [] };
    if (!e.jobs.includes(c.job)) e.jobs.push(c.job);
    jobs.set(k, e);
  }
  const otherCrew = [...jobs.values()].map(({ c, jobs }) => one(c, jobs.join(", "))).sort(order);
  const acted = unique((r.combined_credits?.cast ?? []).filter((c) => !(c.media_type === "tv" && (c.episode_count ?? 0) < 2 && !c.character)).map((c) => one(c, c.character ?? ""))).sort(order);
  return {
    id: r.id,
    name: r.name,
    photo: r.profile_path ? `${IMG}/h632${r.profile_path}` : null,
    knownFor: r.known_for_department ?? "",
    biography: r.biography ?? "",
    born: r.birthday ?? null,
    place: r.place_of_birth ?? null,
    directed,
    acted,
    crew: otherCrew,
  };
}

// ---- An episode's own page ----

export interface EpisodeLink {
  season: number;
  episode: number;
  name: string;
  airDate: string | null;
  still: string | null;
}

export interface EpisodePage {
  season: number;
  episode: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  runtime: number | null;
  vote: number | null;
  still: string | null;
  directors: Credit[];
  writers: Credit[];
  cast: CastMember[];
  crew: CrewGroup[];
  trailer: string | null;
  trailers: Video[];
  /** The season's episodes, for the rail and for stepping back and on. */
  seasonEpisodes: EpisodeLink[];
  previous: EpisodeLink | null;
  next: EpisodeLink | null;
}

type RawEpisodePage = RawEpisode & {
  vote_average?: number;
  crew?: { id: number; name: string; job?: string }[];
  guest_stars?: RawPerson[];
  credits?: { cast?: RawPerson[]; guest_stars?: RawPerson[]; crew?: { id: number; name: string; job?: string }[] };
} & RawVideos;

export async function episodePage(showID: number, season: number, episode: number, seasonCount: number): Promise<EpisodePage | null> {
  const [r, eps] = await Promise.all([
    tmdb<RawEpisodePage>(`/tv/${showID}/season/${season}/episode/${episode}`, { append_to_response: "credits,videos" }),
    seasonEpisodes(showID, season),
  ]);
  if (!r) return null;
  const link = (e: RawEpisode): EpisodeLink => ({ season: e.season_number, episode: e.episode_number, name: e.name, airDate: e.air_date ?? null, still: image.backdrop(e.still_path) });
  const list = eps.map(link);
  const at = list.findIndex((e) => e.episode === episode);
  // Stepping past a season's ends goes on into the next season or back into
  // the last one.
  let previous = at > 0 ? list[at - 1] : null;
  let next = at >= 0 && at < list.length - 1 ? list[at + 1] : null;
  if (!previous && season > 1) {
    const before = await seasonEpisodes(showID, season - 1);
    previous = before.length ? link(before[before.length - 1]) : null;
  }
  if (!next && season < seasonCount) {
    const after = await seasonEpisodes(showID, season + 1);
    next = after.length ? link(after[0]) : null;
  }
  const crew = [...(r.crew ?? []), ...(r.credits?.crew ?? [])].filter((c, i, a) => a.findIndex((x) => x.id === c.id && x.job === c.job) === i);
  const people = (jobs: string[]) => crew.filter((c) => c.job && jobs.includes(c.job)).map((c) => ({ id: c.id, name: c.name })).filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i);
  const cast = [...(r.credits?.cast ?? []), ...(r.guest_stars ?? r.credits?.guest_stars ?? [])]
    .filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i)
    .slice(0, 30)
    .map((p) => ({ id: p.id, name: p.name, character: p.character ?? "", photo: image.profile(p.profile_path) }));
  return {
    season,
    episode,
    name: r.name,
    overview: r.overview || null,
    airDate: r.air_date ?? null,
    runtime: r.runtime ?? null,
    vote: r.vote_average || null,
    still: r.still_path ? `${IMG}/original${r.still_path}` : null,
    directors: people(["Director"]),
    writers: people(["Writer", "Teleplay", "Story", "Screenplay"]),
    cast,
    crew: crewGroups(crew),
    trailer: pickTrailer(r.videos),
    trailers: pickTrailers(r.videos),
    seasonEpisodes: list,
    previous,
    next,
  };
}
