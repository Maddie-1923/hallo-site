import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProGate } from "@/components/ProGate";
import { StatsPage } from "@/components/StatsPage";
import { accountsOpen } from "@/lib/accounts";
import type { LibraryArchive } from "@/lib/archive";
import { optionalLibrary } from "@/lib/library";
import { hasPro } from "@/lib/pro";
import { loadProfile } from "@/lib/profile";
import { previewArchive } from "@/lib/profile-previews";
import { statsInput, watchMinutes } from "@/lib/stats-data";

export const metadata: Metadata = { title: "Stats — Kodigo" };

// Stats (docs/social-plan.md, step 2.5): the full numbers behind the
// profile's panels, as the app's stat pages have them. Pro, like the
// Calendar and Library; before accounts open, development draws it from the
// preview library.
export default async function Stats() {
  let archive: LibraryArchive | null = null;
  let gate: "signin" | "pro" | "empty" | "closed" | null = null;
  let owner: string | null = null;
  if (accountsOpen) {
    const { signedIn, archive: own } = await optionalLibrary();
    if (!signedIn) gate = "signin";
    else if (!(await hasPro())) gate = "pro";
    else if (!own || (own.shows.length === 0 && own.movies.length === 0)) gate = "empty";
    else {
      archive = own;
      owner = (await loadProfile()).username;
    }
  } else {
    archive = await previewArchive();
    if (!archive) gate = "closed";
    else owner = "preview";
  }
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        {archive ? (
          <StatsPage
            input={statsInput(archive)}
            owner={owner}
            watchTime={
              <Suspense fallback={<WatchTimeFigure value="…" note="Adding it up" />}>
                <WatchTime archive={archive} />
              </Suspense>
            }
          />
        ) : (
          <ProGate why={gate ?? "closed"} page="stats" />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

// Watch time, which asks TMDB how long things are, so it arrives a moment
// after the rest of the page.
async function WatchTime({ archive }: { archive: LibraryArchive }) {
  const m = await watchMinutes(archive);
  const total = m.episodes + m.films;
  return <WatchTimeFigure value={compact(total)} note={`${words(m.episodes)} of series, ${words(m.films)} of films`} />;
}

function WatchTimeFigure({ value, note }: { value: string; note: string }) {
  return (
    <>
      <div className="display leading-none text-accent truncate text-[clamp(30px,3.4vw,40px)]">{value}</div>
      <div className="mt-1 text-[10.5px] font-bold uppercase tracking-[.12em] text-dim">Watch time</div>
      <div className="mt-0.5 text-[12px] text-dim truncate" title={note}>
        {note}
      </div>
    </>
  );
}

/** The app's compact figure: 12D 4H, 7H, 45M. */
function compact(minutes: number) {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days) return hours ? `${days}D ${hours}H` : `${days}D`;
  if (hours) return `${hours}H`;
  return `${minutes}M`;
}

function words(minutes: number) {
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hour" : `${hours.toLocaleString("en")} hours`;
}
