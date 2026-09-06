import type { Metadata } from "next";
import { loadLibrary } from "@/lib/library";
import { EmptyLibrary } from "@/components/EmptyLibrary";
import { Shelf } from "@/components/Shelf";
import { profileShelves } from "@/lib/piles";

export const metadata: Metadata = { title: "Profile — Kodigo" };

// Kodigo's own shelves and the person's lists, in that order. The shelves hold
// the settled states — nothing left to act on — which is exactly why they sit
// here rather than on the Shows and Movies lists.
export default async function Profile() {
  const { row } = await loadLibrary();
  if (!row) {
    return (
      <>
        <h1 className="!text-[clamp(44px,8vw,72px)]">Profile</h1>
        <EmptyLibrary />
      </>
    );
  }

  const a = row.archive;
  const ratings = Object.values(a.ratings ?? {});
  const avg = ratings.length ? (ratings.reduce((x, y) => x + y, 0) / ratings.length).toFixed(1) : null;
  const shelves = profileShelves(a);
  const kodigo = shelves.filter((s) => s.kind === "default");
  const own = shelves.filter((s) => s.kind === "custom");

  const tiles = [
    ["Shows", a.shows.length],
    ["Movies", a.movies.length],
    ["Episodes", a.watched.length],
    ["Films seen", a.watchedMovies?.length ?? a.movies.filter((m) => m.status === "Watched").length],
    ["Ratings", ratings.length],
    ["Average", avg ?? "—"],
  ] as const;

  return (
    <div className="wrap py-10">
      <h1 className="!text-[clamp(44px,8vw,72px)]">Profile</h1>

      <div className="grid gap-3 mt-8 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        {tiles.map(([label, value]) => (
          <div key={label} className="card !p-5">
            <div className="display text-4xl leading-none">{value}</div>
            <div className="text-xs text-dim mt-1 uppercase tracking-[.12em]">{label}</div>
          </div>
        ))}
      </div>

      {kodigo.map((s) => (
        <Shelf key={s.id} title={s.name} count={s.items.length} items={s.items} empty={emptyFor(s.id)} />
      ))}

      <div className="mt-14">
        <h2 className="display text-3xl">Your lists</h2>
        {own.length === 0 ? (
          <p className="text-dim text-[15px] mt-2">
            No lists yet. Start one from the list mark on any poster and it shows up here.
          </p>
        ) : (
          own.map((s) => <Shelf key={s.id} title={s.name} count={s.items.length} detail={s.detail} items={s.items} />)
        )}
      </div>
    </div>
  );
}

function emptyFor(id: string) {
  switch (id) {
    case "favorites":
      return "Nothing loved yet. Tap a heart and it lands here.";
    case "finished":
      return "Nothing finished yet.";
    case "onHold":
      return "Nothing set aside.";
    case "dnf":
      return "Nothing given up on.";
    default:
      return undefined;
  }
}
