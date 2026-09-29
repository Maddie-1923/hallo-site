import "server-only";
import type { LibraryArchive } from "@/lib/archive";
import { episodeLength, filmLength, genreNames, image } from "@/lib/tmdb";

// What the Stats page (/stats) is drawn from. The counting by day, week and
// month happens in the browser (components/StatsPage.tsx), because "this
// week" and "your night" depend on the person's own time zone, which the
// server doesn't know; this hands it the dated watches and the library's
// facts. Watch time is worked out apart (watchMinutes), since it asks TMDB
// how long things are and can take a moment the first time.
export interface StatsInput {
  /** Every dated episode watch: when (ISO) and the series id. */
  episodes: [string, number][];
  undatedEpisodes: number;
  /** Every dated film watch: when (ISO) and the film id. */
  films: [string, number][];
  undatedFilms: number;
  shows: { id: number; name: string; poster: string | null; href: string; status: string; episodes: number }[];
  movies: { id: number; title: string; poster: string | null; href: string; status: string }[];
  rated: { key: string; title: string; poster: string | null; href: string; rating: number; kind: "show" | "movie" }[];
  reactions: { loved: number; liked: number; notForMe: number };
  moods: Record<string, number>;
  genres: { name: string; count: number }[];
}

export function statsInput(a: LibraryArchive): StatsInput {
  const shows = new Map(a.shows.map((t) => [t.show.id, t.show]));
  const movies = new Map(a.movies.map((t) => [t.movie.id, t.movie]));
  const dates = a.watchedDates ?? {};
  const episodes: [string, number][] = [];
  let undatedEpisodes = 0;
  const perShow = new Map<number, number>();
  for (const k of a.watched) {
    const sid = Number(k.split("-")[0]);
    perShow.set(sid, (perShow.get(sid) ?? 0) + 1);
    if (dates[k]) episodes.push([dates[k], sid]);
    else undatedEpisodes++;
  }
  const filmDates = a.movieWatchedDates ?? {};
  const watchedFilms = new Set([...(a.watchedMovies ?? []), ...Object.keys(filmDates).map(Number)]);
  const films: [string, number][] = [];
  let undatedFilms = 0;
  for (const id of watchedFilms) {
    const d = filmDates[String(id)];
    if (d) films.push([d, id]);
    else undatedFilms++;
  }

  const rated: StatsInput["rated"] = [];
  for (const [key, rating] of Object.entries(a.ratings ?? {})) {
    const [kind, id] = key.split(":");
    if (kind === "show" && shows.get(Number(id))) {
      const s = shows.get(Number(id))!;
      rated.push({ key, kind: "show", title: s.name, poster: image.poster(s.poster_path, "w342"), href: `/show/${s.id}`, rating });
    } else if (kind === "movie" && movies.get(Number(id))) {
      const m = movies.get(Number(id))!;
      rated.push({ key, kind: "movie", title: m.title, poster: image.poster(m.poster_path, "w342"), href: `/movie/${m.id}`, rating });
    }
  }

  const reactions = { loved: 0, liked: 0, notForMe: 0 };
  for (const r of Object.values(a.reactions ?? {})) if (r in reactions) reactions[r as keyof typeof reactions]++;
  const moods: Record<string, number> = {};
  for (const list of Object.values(a.moods ?? {})) for (const m of list) moods[m] = (moods[m] ?? 0) + 1;
  // Genres across everything tracked, a series counted once however many
  // episodes (the profile's rule).
  const genreCount = new Map<string, number>();
  for (const t of [...a.shows.map((x) => x.show), ...a.movies.map((x) => x.movie)]) for (const g of genreNames(t.genre_ids, 3)) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);

  return {
    episodes,
    undatedEpisodes,
    films,
    undatedFilms,
    shows: a.shows.map((t) => ({ id: t.show.id, name: t.show.name, poster: image.poster(t.show.poster_path, "w342"), href: `/show/${t.show.id}`, status: t.status, episodes: perShow.get(t.show.id) ?? 0 })),
    movies: a.movies.map((t) => ({ id: t.movie.id, title: t.movie.title, poster: image.poster(t.movie.poster_path, "w342"), href: `/movie/${t.movie.id}`, status: t.status })),
    rated: rated.sort((x, y) => y.rating - x.rating || x.title.localeCompare(y.title)),
    reactions,
    moods,
    genres: [...genreCount.entries()].map(([name, count]) => ({ name, count })).sort((x, y) => y.count - x.count),
  };
}

/** Minutes watched: each series' episodes ticked times its usual episode
    length, and each watched film still in the library at its length (the
    app's rule: an id alone carries no runtime). Eight TMDB asks at a time. */
export async function watchMinutes(a: LibraryArchive): Promise<{ episodes: number; films: number }> {
  const perShow = new Map<number, number>();
  for (const k of a.watched) {
    const sid = Number(k.split("-")[0]);
    perShow.set(sid, (perShow.get(sid) ?? 0) + 1);
  }
  const showIDs = [...perShow.keys()];
  let episodes = 0;
  for (let i = 0; i < showIDs.length; i += 8) {
    const batch = showIDs.slice(i, i + 8);
    const lengths = await Promise.all(batch.map((id) => episodeLength(id).catch(() => 42)));
    batch.forEach((id, j) => (episodes += perShow.get(id)! * lengths[j]));
  }
  const watched = new Set([...(a.watchedMovies ?? []), ...Object.keys(a.movieWatchedDates ?? {}).map(Number)]);
  const tracked = a.movies.filter((t) => watched.has(t.movie.id));
  let films = 0;
  for (let i = 0; i < tracked.length; i += 8) {
    const batch = tracked.slice(i, i + 8);
    const lengths = await Promise.all(batch.map((t) => (t.movie.runtime ? Promise.resolve(t.movie.runtime) : filmLength(t.movie.id).catch(() => null))));
    films += lengths.reduce<number>((n, m) => n + (m ?? 0), 0);
  }
  return { episodes, films };
}
