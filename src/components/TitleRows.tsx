import { WideRow, type WideItem } from "@/components/WideRow";
import type { CinemaSlide } from "@/components/CinemaHero";
import { cardBackdrop, image, movieBillboard, showBillboard, titleLogo } from "@/lib/tmdb";
import { year, type LibraryArchive, type Movie, type Show } from "@/lib/archive";

// The pieces the home page and Explore share: the billboard's slides built
// from a list of trending titles, and rows of wide cards. Explore is the home
// page's layout with one catalogue at a time.

export async function billboard(shows: Show[], movies: Movie[], archive: LibraryArchive | null, region: string): Promise<CinemaSlide[]> {
  // Films and series taking turns, only titles with artwork behind them.
  const picks: ({ kind: "show"; show: Show } | { kind: "movie"; movie: Movie })[] = [];
  const s = shows.filter((x) => x.backdrop_path);
  const m = movies.filter((x) => x.backdrop_path);
  for (let i = 0; picks.length < 8 && (i < s.length || i < m.length); i++) {
    if (m[i]) picks.push({ kind: "movie", movie: m[i] });
    if (s[i] && picks.length < 8) picks.push({ kind: "show", show: s[i] });
  }

  const tracked = {
    show: new Set(archive?.shows.map((t) => t.show.id) ?? []),
    movie: new Set(archive?.movies.map((t) => t.movie.id) ?? []),
  };

  const [details, logos] = await Promise.all([
    Promise.all(picks.map((p) => (p.kind === "show" ? showBillboard(p.show.id, region) : movieBillboard(p.movie.id, region)))),
    Promise.all(picks.map((p) => (p.kind === "show" ? titleLogo("show", p.show.id) : titleLogo("movie", p.movie.id)))),
  ]);

  return picks.map((p, i): CinemaSlide => {
    const d = details[i];
    const isShow = p.kind === "show";
    const t = isShow ? p.show : p.movie;
    const id = t.id;
    return {
      key: `${isShow ? "s" : "m"}${id}`,
      eyebrow: isShow ? "Trending series" : "Trending film",
      title: isShow ? p.show.name : p.movie.title,
      href: isShow ? `/show/${id}` : `/movie/${id}`,
      backdrop: image.banner(t.backdrop_path)!,
      thumb: image.backdrop(t.backdrop_path)!,
      tagline: d?.tagline ?? null,
      year: year(isShow ? p.show.first_air_date : p.movie.release_date),
      certification: d?.certification ?? null,
      runtime: d?.runtime ?? null,
      genres: d?.genres ?? [],
      overview: t.overview ?? null,
      trailer: d?.trailer ?? null,
      logo: logos[i],
      target: p,
      tracked: isShow ? tracked.show.has(id) : tracked.movie.has(id),
    };
  });
}

// A title on its way into a row, before it is turned into a card.
export interface PosterItem {
  key: string;
  href: string;
  title: string;
  backdrop: string | null | undefined;
}

export const asShows = (xs: Show[]): PosterItem[] => xs.map((s) => ({ key: `s${s.id}`, href: `/show/${s.id}`, title: s.name, backdrop: s.backdrop_path }));
export const asMovies = (xs: Movie[]): PosterItem[] => xs.map((m) => ({ key: `m${m.id}`, href: `/movie/${m.id}`, title: m.title, backdrop: m.backdrop_path }));

// Landscape cards need a backdrop, and look like a streaming service's with
// the title's logo on them. Logos are one request a title, cached for a day,
// so a row asks only for the cards it draws.
async function asWide(items: PosterItem[], limit = 16): Promise<WideItem[]> {
  const withArt = items.filter((it) => it.backdrop).slice(0, limit);
  const logos = await Promise.all(withArt.map((it) => titleLogo(it.key.startsWith("s") ? "show" : "movie", Number(it.key.slice(1)))));
  return withArt.map((it, i) => ({ key: it.key, href: it.href, title: it.title, backdrop: cardBackdrop(it.backdrop)!, logo: logos[i] }));
}

export async function Row({ title, href, items }: { title: string; href: string; items: PosterItem[] }) {
  return <WideRow title={title} href={href} items={await asWide(items)} />;
}

export function interleave<T>(a: T[], b: T[]) {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

