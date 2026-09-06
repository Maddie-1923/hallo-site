import type { LibraryArchive } from "./archive";
import type { MarkState } from "@/components/MarkButtons";

export interface ListOption {
  id: string;
  name: string;
}

// What the marks should show for a title, read off the archive: loved is the
// reaction, watched is Watched for a film and Watching for a show, plus the
// rating, whether it's tracked at all, and which custom lists hold it. The
// lists themselves ride along so the menu can offer them.
export function markLookup(archive: LibraryArchive | null) {
  const reactions = archive?.reactions ?? {};
  const ratings = archive?.ratings ?? {};
  const shows = new Map(archive?.shows.map((t) => [t.show.id, t.status]) ?? []);
  const movies = new Map(archive?.movies.map((t) => [t.movie.id, t.status]) ?? []);
  const order = archive?.customListOrder ?? [];
  const rank = new Map(order.map((id, i) => [id, i]));
  const custom = [...(archive?.customLists ?? [])].sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));
  const lists: ListOption[] = custom.map((l) => ({ id: l.id, name: l.name }));
  return {
    lists,
    show: (id: number): MarkState => ({
      loved: reactions[`show:${id}`] === "loved",
      watched: shows.get(id) === "Watching",
      tracked: shows.has(id),
      rating: ratings[`show:${id}`] ?? null,
      listIDs: custom.filter((l) => (l.showIDs ?? []).includes(id)).map((l) => l.id),
    }),
    movie: (id: number): MarkState => ({
      loved: reactions[`movie:${id}`] === "loved",
      watched: movies.get(id) === "Watched",
      tracked: movies.has(id),
      rating: ratings[`movie:${id}`] ?? null,
      listIDs: custom.filter((l) => (l.movieIDs ?? []).includes(id)).map((l) => l.id),
    }),
  };
}
