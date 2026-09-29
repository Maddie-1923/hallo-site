import "server-only";
import type { LibraryArchive } from "./archive";
import { GENRES } from "./browse";
import { image } from "./tmdb";

// Year in Review: one person's year of watching, from their library, made
// to be read and shared. Everything comes from the days they checked things
// off, so a year without dated watches has nothing to show.
export interface YearTitle {
  key: string;
  kind: "show" | "movie";
  title: string;
  href: string;
  poster: string | null;
  backdrop: string | null;
  /** Episodes that year (a series), or its rating (a film). */
  count?: number;
  rating?: number | null;
}

export interface YearReview {
  year: number;
  /** Other years with watches, newest first, for the year picker. */
  years: number[];
  hours: number;
  episodes: number;
  films: number;
  shows: number;
  months: number[]; // 12 counts
  busiestDay: { date: string; count: number } | null;
  streak: number;
  weekday: string | null;
  topShows: YearTitle[];
  topFilms: YearTitle[];
  genres: { name: string; share: number }[];
  moods: { name: string; count: number }[];
  loved: number;
  first: { date: string; t: YearTitle; detail?: string } | null;
  last: { date: string; t: YearTitle; detail?: string } | null;
}

/** Minutes per episode when the library doesn't say. */
const EPISODE_MINUTES = 45;

export function yearReview(a: LibraryArchive, year: number): YearReview | null {
  const shows = new Map(a.shows.map((t) => [t.show.id, t.show]));
  const films = new Map(a.movies.map((t) => [t.movie.id, t.movie]));
  const show = (id: number): YearTitle | null => {
    const s = shows.get(id);
    return s ? { key: `s${id}`, kind: "show", title: s.name, href: `/show/${id}`, poster: image.poster(s.poster_path), backdrop: image.banner(s.backdrop_path) } : null;
  };
  const film = (id: number): YearTitle | null => {
    const m = films.get(id);
    return m ? { key: `m${id}`, kind: "movie", title: m.title, href: `/movie/${id}`, poster: image.poster(m.poster_path), backdrop: image.banner(m.backdrop_path) } : null;
  };

  // Every dated watch: an episode ("showID-s-e") or a film (its id).
  type Watch = { date: string; show?: number; film?: number; ep?: string };
  const all: Watch[] = [
    ...Object.entries(a.watchedDates ?? {}).map(([k, d]) => ({ date: d.slice(0, 10), show: Number(k.split("-")[0]), ep: k.split("-").slice(1).join("-") })),
    ...Object.entries(a.movieWatchedDates ?? {}).map(([k, d]) => ({ date: d.slice(0, 10), film: Number(k) })),
  ].filter((w) => /^\d{4}-\d{2}-\d{2}$/.test(w.date));
  const years = [...new Set(all.map((w) => Number(w.date.slice(0, 4))))].sort((x, y) => y - x);
  const ws = all.filter((w) => w.date.startsWith(`${year}-`)).sort((x, y) => x.date.localeCompare(y.date));
  if (!ws.length) return null;

  const eps = ws.filter((w) => w.show != null);
  const fs = ws.filter((w) => w.film != null);
  const minutes = eps.length * EPISODE_MINUTES + fs.reduce((sum, w) => sum + (films.get(w.film!)?.runtime ?? 110), 0);

  const months = Array.from({ length: 12 }, (_, i) => ws.filter((w) => Number(w.date.slice(5, 7)) === i + 1).length);
  const perDay = new Map<string, number>();
  for (const w of ws) perDay.set(w.date, (perDay.get(w.date) ?? 0) + 1);
  const busiest = [...perDay.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0];
  // The longest run of days in a row with something watched.
  const days = [...perDay.keys()].sort();
  let streak = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i > 0 && Date.parse(d) - Date.parse(days[i - 1]) === 86_400_000 ? run + 1 : 1;
    streak = Math.max(streak, run);
  });
  const dow = Array(7).fill(0);
  for (const w of ws) dow[new Date(`${w.date}T12:00:00Z`).getUTCDay()]++;
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dow.indexOf(Math.max(...dow))];

  const byShow = new Map<number, number>();
  for (const w of eps) byShow.set(w.show!, (byShow.get(w.show!) ?? 0) + 1);
  const topShows = [...byShow.entries()]
    .sort((x, y) => y[1] - x[1])
    .map(([id, n]) => {
      const t = show(id);
      return t ? ({ ...t, count: n } as YearTitle) : null;
    })
    .filter((x): x is YearTitle => !!x)
    .slice(0, 5);
  const filmIDs = [...new Set(fs.map((w) => w.film!))];
  const topFilms = filmIDs
    .map((id) => {
      const t = film(id);
      return t ? ({ ...t, rating: a.ratings?.[`movie:${id}`] ?? null } as YearTitle) : null;
    })
    .filter((x): x is YearTitle => !!x)
    .sort((x, y) => (y.rating ?? -1) - (x.rating ?? -1))
    .slice(0, 5);

  // Genres by how much of the year they took.
  const names = new Map([...GENRES.films, ...GENRES.series]);
  const g = new Map<string, number>();
  for (const w of ws) {
    const ids = (w.show != null ? shows.get(w.show)?.genre_ids : films.get(w.film!)?.genre_ids) ?? [];
    for (const id of ids) {
      const n = names.get(id);
      if (n) g.set(n, (g.get(n) ?? 0) + 1);
    }
  }
  const gTotal = [...g.values()].reduce((x, y) => x + y, 0) || 1;
  const genres = [...g.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([name, n]) => ({ name, share: n / gTotal }));

  // How it left them: the moods on what they watched this year.
  const seenKeys = new Set([...byShow.keys()].map((id) => `show:${id}`).concat(filmIDs.map((id) => `movie:${id}`)));
  const m = new Map<string, number>();
  for (const [k, list] of Object.entries(a.moods ?? {})) if (seenKeys.has(k)) for (const mood of list) m.set(mood, (m.get(mood) ?? 0) + 1);
  const moods = [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([name, count]) => ({ name, count }));
  const loved = [...seenKeys].filter((k) => a.reactions?.[k] === "loved").length;

  const entry = (w: Watch | undefined) => {
    if (!w) return null;
    const t = w.show != null ? show(w.show) : film(w.film!);
    if (!t) return null;
    const [s, e] = (w.ep ?? "").split("-");
    return { date: w.date, t, detail: w.ep ? `S${s.padStart(2, "0")} | E${e.padStart(2, "0")}` : undefined };
  };

  return {
    year,
    years,
    hours: Math.round(minutes / 60),
    episodes: eps.length,
    films: filmIDs.length,
    shows: byShow.size,
    months,
    busiestDay: busiest ? { date: busiest[0], count: busiest[1] } : null,
    streak,
    weekday,
    topShows,
    topFilms,
    genres,
    moods,
    loved,
    first: entry(ws[0]),
    last: entry(ws[ws.length - 1]),
  };
}
