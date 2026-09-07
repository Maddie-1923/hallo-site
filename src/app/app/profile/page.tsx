import type { Metadata } from "next";
import Link from "next/link";
import { loadLibrary } from "@/lib/library";
import { loadProfile } from "@/lib/profile";
import { EmptyLibrary } from "@/components/EmptyLibrary";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ShelfCard } from "@/components/ShelfCard";
import { Shelf } from "@/components/Shelf";
import { profileShelves } from "@/lib/piles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile — Kodigo" };

// Where the settled things live: the banner and the name, the numbers, the
// shelves that have nothing left to act on, and the person's own lists. The
// Shows and Movies pages carry what is still waiting.
export default async function Profile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ row }, profile] = await Promise.all([loadLibrary(), loadProfile()]);

  const a = row?.archive ?? null;
  const shelves = profileShelves(a);
  const kodigo = shelves.filter((s) => s.kind === "default");
  const own = shelves.filter((s) => s.kind === "custom");

  const ratings = Object.values(a?.ratings ?? {});
  const episodes = a?.watched.length ?? 0;
  // Episodes have no runtime in the archive, so this is the honest estimate:
  // 42 minutes an episode, the length of an hour-long drama once the ads are
  // out. Films carry no runtime either until a title page has been opened.
  const daysWatched = Math.round((episodes * 42) / 60 / 24);

  const tiles: [string, string | number][] = [
    ["Episodes", episodes],
    ["Shows", a?.shows.length ?? 0],
    ["Movies", a?.movies.length ?? 0],
    ["Days watched", daysWatched],
    ["Ratings", ratings.length],
    ["Average", ratings.length ? (ratings.reduce((x, y) => x + y, 0) / ratings.length).toFixed(1) : "—"],
  ];

  return (
    <>
      <ProfileHeader profile={profile} archive={a} email={user?.email ?? ""} />

      <div className="wrap pb-16">
        {!row ? (
          <div className="mt-10">
            <EmptyLibrary />
          </div>
        ) : (
          <>
            <div className="grid gap-3 mt-9 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
              {tiles.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-card p-5 text-center">
                  <div className="display text-4xl leading-none">{value}</div>
                  <div className="text-[10px] font-bold tracking-[.16em] uppercase text-dim mt-2">{label}</div>
                </div>
              ))}
              {/* A tile that goes somewhere, sitting in the row it belongs to
                  rather than in the nav — History is a thing you look at
                  occasionally, not a place you live. */}
              <Link href="/app/history" className="rounded-2xl bg-card hover:bg-card-hi p-5 text-center no-underline transition-colors">
                <div className="display text-4xl leading-none text-accent">◷</div>
                <div className="text-[10px] font-bold tracking-[.16em] uppercase text-dim mt-2">History</div>
              </Link>
            </div>

            <h2 className="display text-3xl mt-14 mb-4">Shelves</h2>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
              {kodigo.map((s) => (
                <ShelfCard key={s.id} shelf={s} href={`/app/profile#${s.id}`} />
              ))}
            </div>

            <h2 className="display text-3xl mt-14 mb-4">Your lists</h2>
            {own.length === 0 ? (
              <p className="text-dim text-[15px] m-0">
                No lists yet. Start one from the list mark on any poster and it shows up here.
              </p>
            ) : (
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
                {own.map((s) => (
                  <ShelfCard key={s.id} shelf={s} href={`/app/profile#${s.id}`} />
                ))}
              </div>
            )}

            {/* The shelves in full, below the cards. A card says how many; this
                is where somebody scrolls to actually look at them. */}
            {[...kodigo, ...own]
              .filter((s) => s.items.length > 0)
              .map((s) => (
                <div key={s.id} id={s.id} className="scroll-mt-24">
                  <Shelf title={s.name} count={s.items.length} detail={s.detail} items={s.items} />
                </div>
              ))}
          </>
        )}
      </div>
    </>
  );
}
