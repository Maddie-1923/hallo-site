import type { Movie, Show } from "@/lib/archive";
import type { markLookup } from "@/lib/marks";
import { PosterCard } from "./PosterRow";

// The grid a row opens into, and Browse's results: the same poster cards as
// the rows (title, year, and the More and Add keys under each), in columns.
// `marks` is the visitor's library read into what each card's keys show.
export type GridTitle = {
  key: string;
  href: string;
  title: string;
  poster: string | null;
  sub: string;
  target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };
};

export function PosterGrid({ titles, marks }: { titles: GridTitle[]; marks: ReturnType<typeof markLookup> }) {
  return (
    <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {titles.map((t) => (
        <PosterCard
          key={t.key}
          it={{ ...t, marks: t.target.kind === "show" ? marks.show(t.target.show.id) : marks.movie(t.target.movie.id) }}
          lists={marks.lists}
        />
      ))}
    </div>
  );
}
