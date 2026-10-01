import type { Movie, Show } from "@/lib/archive";

/** A title on its way into a poster grid (InfiniteGrid), before the
    visitor's marks are read onto it. */
export type GridTitle = {
  key: string;
  href: string;
  title: string;
  poster: string | null;
  sub: string;
  target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };
};
