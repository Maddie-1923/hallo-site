import type { Movie, Show } from "@/lib/archive";
import { year } from "@/lib/archive";
import { genreNames, image } from "@/lib/tmdb";
import { HeroCarousel, type HeroSlide } from "./HeroCarousel";
import type { markLookup } from "@/lib/marks";

type Featured = { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };

// Server side of the billboard: turns shows and films into flat slides
// (URLs built, genres named) and hands them to the client carousel. Only
// titles with a backdrop make a slide — a hero with nothing behind the type
// is a grey box.
export function DiscoverHero({ featured, label, marks, limit = 8 }: { featured: Featured[]; label: string; marks: ReturnType<typeof markLookup>; limit?: number }) {
  const slides: HeroSlide[] = featured
    .map((f): HeroSlide | null => {
      if (f.kind === "show") {
        if (!f.show.backdrop_path) return null;
        return {
          key: `s${f.show.id}`,
          kindLabel: "Show",
          title: f.show.name,
          href: `/show/${f.show.id}`,
          backdrop: image.banner(f.show.backdrop_path),
          rating: f.show.vote_average ?? null,
          year: year(f.show.first_air_date),
          genres: genreNames(f.show.genre_ids),
          overview: f.show.overview ?? null,
          target: f,
          marks: marks.show(f.show.id),
        };
      }
      if (!f.movie.backdrop_path) return null;
      return {
        key: `m${f.movie.id}`,
        kindLabel: "Film",
        title: f.movie.title,
        href: `/movie/${f.movie.id}`,
        backdrop: image.banner(f.movie.backdrop_path),
        rating: f.movie.vote_average ?? null,
        year: year(f.movie.release_date),
        genres: genreNames(f.movie.genre_ids),
        overview: f.movie.overview ?? null,
        target: f,
        marks: marks.movie(f.movie.id),
      };
    })
    .filter((s): s is HeroSlide => s !== null)
    .slice(0, limit);

  if (slides.length === 0) return <div className="h-6" />;
  return <HeroCarousel slides={slides} label={label} lists={marks.lists} />;
}
