import { WideRow, type WideItem } from "@/components/WideRow";
import type { CinemaSlide } from "@/components/CinemaHero";
import { cardBackdrop, image, movieBillboard, showBillboard, titleLogo } from "@/lib/tmdb";
import { year, type LibraryArchive, type Movie, type Show } from "@/lib/archive";
import type { markLookup } from "@/lib/marks";

// The pieces the home page and Explore share: the billboard's slides built
// from a list of trending titles, and rows of wide cards. Explore is the home
// page's layout with one catalogue at a time.

export async function billboard(
  shows: Show[],
  movies: Movie[],
  archive: LibraryArchive | null,
  region: string,
  // The most anticipated titles still to come, mixed in among the trending
  // ones so the billboard shows what's next as well as what's now.
  anticipated: { shows?: Show[]; movies?: Movie[] } = {},
  // The tracker's own words over its slides ("New episode · S01 | E07"),
  // by the slide's key ("s123", "m456").
  eyebrows: Record<string, string> = {},
): Promise<CinemaSlide[]> {
  type Pick = ({ kind: "show"; show: Show } | { kind: "movie"; movie: Movie }) & { coming?: string };
  // Films and series taking turns, only titles with artwork behind them.
  const alternate = (s: Show[], m: Movie[], n: number, coming = false) => {
    const out: Pick[] = [];
    const ss = s.filter((x) => x.backdrop_path);
    const mm = m.filter((x) => x.backdrop_path);
    for (let i = 0; out.length < n && (i < ss.length || i < mm.length); i++) {
      if (mm[i]) out.push({ kind: "movie", movie: mm[i], ...(coming ? { coming: mm[i].release_date ?? "" } : {}) });
      if (ss[i] && out.length < n) out.push({ kind: "show", show: ss[i], ...(coming ? { coming: ss[i].first_air_date ?? "" } : {}) });
    }
    return out;
  };
  const soon = alternate(anticipated.shows ?? [], anticipated.movies ?? [], 3, true);
  const now = alternate(shows, movies, 8 - soon.length).filter((p) => !soon.some((q) => q.kind === p.kind && (q.kind === "show" ? q.show.id === (p as { show: Show }).show?.id : q.movie.id === (p as { movie: Movie }).movie?.id)));
  // Two trending, one to come, and so on: the anticipated ones are seen early.
  const picks: Pick[] = [];
  for (let i = 0, j = 0; picks.length < now.length + soon.length; ) {
    if (i < now.length) picks.push(now[i++]);
    if (i < now.length) picks.push(now[i++]);
    if (j < soon.length) picks.push(soon[j++]);
    if (i >= now.length && j >= soon.length) break;
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
      eyebrow: eyebrows[`${isShow ? "s" : "m"}${id}`] ?? (p.coming ? `${isShow ? "Series" : "Film"} coming ${comingDate(p.coming)}` : isShow ? "Trending series" : "Trending film"),
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

/** "12 December" this year, "12 December 2027" beyond it. */
function comingDate(d: string) {
  if (!d) return "soon";
  const [y, m, day] = d.split("-").map(Number);
  const sameYear = y === new Date().getFullYear();
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" });
}

// A title on its way into a row, before it is turned into a card.
export interface PosterItem {
  key: string;
  href: string;
  title: string;
  backdrop: string | null | undefined;
  target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };
}

export const asShows = (xs: Show[]): PosterItem[] => xs.map((s) => ({ key: `s${s.id}`, href: `/show/${s.id}`, title: s.name, backdrop: s.backdrop_path, target: { kind: "show" as const, show: s } }));
export const asMovies = (xs: Movie[]): PosterItem[] => xs.map((m) => ({ key: `m${m.id}`, href: `/movie/${m.id}`, title: m.title, backdrop: m.backdrop_path, target: { kind: "movie" as const, movie: m } }));

// Landscape cards need a backdrop, and look like a streaming service's with
// the title's logo on them. Logos are one request a title, cached for a day,
// so a row asks only for the cards it draws.
async function asWide(items: PosterItem[], marks: Marks, limit = 16): Promise<WideItem[]> {
  const withArt = items.filter((it) => it.backdrop).slice(0, limit);
  const logos = await Promise.all(withArt.map((it) => titleLogo(it.target.kind, it.target.kind === "show" ? it.target.show.id : it.target.movie.id)));
  return withArt.map((it, i) => ({
    key: it.key,
    href: it.href,
    title: it.title,
    backdrop: cardBackdrop(it.backdrop)!,
    logo: logos[i],
    target: it.target,
    marks: it.target.kind === "show" ? marks.show(it.target.show.id) : marks.movie(it.target.movie.id),
  }));
}

type Marks = ReturnType<typeof markLookup>;

/** A row of wide cards. `marks` is the visitor's library read into what each
    card's hover buttons should show (all off when nobody is signed in). */
export async function Row({ title, href, items, marks }: { title: string; href: string; items: PosterItem[]; marks: Marks }) {
  return <WideRow title={title} href={href} items={await asWide(items, marks)} lists={marks.lists} />;
}

export function interleave<T>(a: T[], b: T[]) {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

