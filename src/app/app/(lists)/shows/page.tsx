import type { Metadata } from "next";
import { loadLibrary } from "@/lib/library";
import { EmptyLibrary } from "@/components/EmptyLibrary";
import { Shelf } from "@/components/Shelf";
import { showPiles } from "@/lib/piles";

export const metadata: Metadata = { title: "Shows — Kodigo" };

// The app's Shows list: the three piles that are waiting on you, in the order
// the app stacks them. The settled statuses — Finished, On Hold, Did Not
// Finish — live on the profile, so they are not drawn twice.
export default async function Shows() {
  const { row } = await loadLibrary();
  if (!row) return <EmptyLibrary />;
  const piles = showPiles(row.archive);

  const runs = [
    { title: "Up Next", items: piles.upNext, empty: "Nothing waiting. Check something off and it lands here." },
    { title: "Ready to Start", items: piles.readyToStart, empty: "No series waiting to be begun." },
    { title: "Entering the Void", items: piles.theVoid, empty: "Nothing has gone quiet." },
    { title: "Watched", items: piles.watched, empty: "Nothing finished yet." },
  ];

  return (
    <>
      {runs.map((r) => (
        <Shelf
          key={r.title}
          title={r.title}
          count={r.items.length}
          empty={r.empty}
          items={r.items.map((t) => ({ key: `s${t.show.id}`, id: t.show.id, kind: "show" as const, path: t.show.poster_path, name: t.show.name, href: `/show/${t.show.id}` }))}
        />
      ))}
    </>
  );
}
