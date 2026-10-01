import "server-only";
import { movieRails, showRails } from "@/lib/tmdb";
import { poster, year, type Movie, type Show } from "@/lib/archive";
import type { GridTitle } from "@/components/PosterGrid";

// The built-in rows on Home and Explore, each with an address of its own, so
// a row's heading can open everything in it — the app's "show all" grid.
// Mixed rows take films and series in turns, as the row itself does.

export const showCards = (xs: Show[]): GridTitle[] => xs.map((s) => ({ key: `s${s.id}`, href: `/show/${s.id}`, title: s.name, poster: poster(s.poster_path, "w342"), sub: year(s.first_air_date), target: { kind: "show", show: s } }));
export const movieCards = (xs: Movie[]): GridTitle[] => xs.map((m) => ({ key: `m${m.id}`, href: `/movie/${m.id}`, title: m.title, poster: poster(m.poster_path, "w342"), sub: year(m.release_date), target: { kind: "movie", movie: m } }));
const shows = showCards;
const movies = movieCards;
function turns(a: GridTitle[], b: GridTitle[]) {
  const out: GridTitle[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

type Rail = {
  title: (place: string) => string;
  /** Where "back" goes: the Explore tab the row lives on. */
  back: "/explore" | "/shows" | "/movies";
  page: (page: number, region: string) => Promise<GridTitle[]>;
};

export const EXPLORE_RAILS: Record<string, Rail> = {
  trending: { title: () => "Trending this week", back: "/explore", page: async (p) => turns(movies(await movieRails.trending(p)), shows(await showRails.trending(p))) },
  "trending-series": { title: () => "Trending series this week", back: "/shows", page: async (p) => shows(await showRails.trending(p)) },
  "trending-films": { title: () => "Trending films this week", back: "/movies", page: async (p) => movies(await movieRails.trending(p)) },
  "in-cinemas": { title: (place) => `In cinemas · ${place}`, back: "/movies", page: async (p, r) => movies(await movieRails.nowPlaying(r, p)) },
  "new-episodes": { title: () => "New episodes this week", back: "/shows", page: async (p) => shows(await showRails.airingNow(p)) },
  "coming-soon": { title: () => "Coming soon", back: "/explore", page: async (p, r) => turns(movies(await movieRails.upcoming(r, p)), shows(await showRails.upcoming(p))) },
  "coming-soon-films": { title: (place) => `Coming soon · ${place}`, back: "/movies", page: async (p, r) => movies(await movieRails.upcoming(r, p)) },
  "new-series": { title: () => "New series coming", back: "/shows", page: async (p) => shows(await showRails.upcoming(p)) },
  "popular-series": { title: () => "Popular series", back: "/shows", page: async (p) => shows(await showRails.popular(p)) },
  "popular-films": { title: () => "Popular films", back: "/movies", page: async (p) => movies(await movieRails.popular(p)) },
  "top-rated": { title: () => "Top rated", back: "/explore", page: async (p) => turns(movies(await movieRails.topRated(p)), shows(await showRails.topRated(p))) },
  "top-rated-series": { title: () => "Top rated series", back: "/shows", page: async (p) => shows(await showRails.topRated(p)) },
  "top-rated-films": { title: () => "Top rated films", back: "/movies", page: async (p) => movies(await movieRails.topRated(p)) },
};

export const railHref = (slug: keyof typeof EXPLORE_RAILS) => `/explore/rail/${slug}`;
