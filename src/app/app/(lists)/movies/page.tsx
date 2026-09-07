import type { Metadata } from "next";
import { loadLibrary } from "@/lib/library";
import { EmptyLibrary } from "@/components/EmptyLibrary";
import { Shelf } from "@/components/Shelf";
import { moviePiles } from "@/lib/piles";

export const metadata: Metadata = { title: "Movies — Kodigo" };

// The film halves of the same piles. A film has no middle — you have started
// it or you have not — so there is no Up Next here, which is why the app calls
// the unwatched pile Ready to Start on both tabs.
export default async function Movies() {
  const { row } = await loadLibrary();
  if (!row) return <EmptyLibrary />;
  const piles = moviePiles(row.archive);

  const runs = [
    { title: "Ready to Start", items: piles.readyToStart, empty: "No films waiting." },
    { title: "Entering the Void", items: piles.theVoid, empty: "Nothing has sat unwatched that long." },
    { title: "Watched", items: piles.watched, empty: "Nothing watched yet." },
  ];

  return (
    <>
      {runs.map((r) => (
        <Shelf
          key={r.title}
          title={r.title}
          count={r.items.length}
          empty={r.empty}
          items={r.items.map((t) => ({ key: `m${t.movie.id}`, id: t.movie.id, kind: "movie" as const, path: t.movie.poster_path, name: t.movie.title, href: `/movie/${t.movie.id}` }))}
        />
      ))}
    </>
  );
}
