import Link from "next/link";
import { SiteFooter } from "./SiteFooter";
import { PosterWall, type WallPoster } from "./PosterWall";
import { BrowserFrame, PhoneFrame, Showcase } from "./Showcase";
import { ScaledPage } from "./ScaledPage";
import { TrackerBoard } from "./TrackerBoard";
import { sampleLibrary } from "@/lib/sample-library";
import { trackerFromArchive } from "@/lib/tracker";
import { Row, asMovies, asShows, interleave } from "./TitleRows";
import { markLookup } from "@/lib/marks";
import { visitorRegion } from "@/lib/region";
import { AndroidWidgets, IPhoneWidgets, type WidgetTitle } from "./WidgetHomes";
import { ExploreScreen, UpNextScreen, type AppEpisode, type AppPoster } from "./AppScreens";
import { image, movieRails, showRails } from "@/lib/tmdb";

// kodigo.pro for someone who isn't signed in: the front door to the whole of
// Kodigo, the website and the app together. The first screen is the poster
// wall (components/PosterWall.tsx, after Apple TV's page, 17 Oct 2026): what
// it is in one line and the two ways in, nothing else. Below it, what it's
// for (track, review, people), and the two questions left: can I bring my
// history, and what does it cost. Signed in, the poster home is the front
// page instead (app/page.tsx), and Explore keeps the rows open to everyone.

const sources = ["Letterboxd", "Trakt", "TV Time", "IMDb", "Simkl"];

const faq = [
  ["Is Kodigo free?", "The website is, with ads: browse, rate, review, make lists and follow people with a free account. The apps come with Kodigo Pro, $1.99 a month or $15.99 a year, and new subscribers on iPhone get 7 days free. Pro also takes the ads off the website and adds tracking, the calendar and stats there."],
  ["Do I need the app?", "Not for the website, which works on its own. Pro is bought in the app, and once you have it the same library is on your phone and here, with no ads."],
  ["Can I keep my profile private?", "Yes. Turn off your public profile in Settings and only people you approve can see what you watch and write."],
  ["Where does the show and film information come from?", "TMDB provides titles, episodes and artwork, and air times come from TVmaze."],
];

// The wall: this week's trending and the best-rated of all time, shows and
// films taking turns. A failed fetch costs pictures and nothing else.
function wall(lists: { id: number; poster_path?: string | null; name?: string; title?: string }[][]): WallPoster[] {
  const out: WallPoster[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    lists.forEach((list, k) => {
      const t = list[i];
      const src = image.poster(t?.poster_path, "w342");
      const key = `${k % 2 ? "m" : "s"}${t?.id}`;
      if (!t || !src || seen.has(key)) return;
      seen.add(key);
      out.push({ key, src, title: t.name ?? t.title ?? "" });
    });
  }
  return out.slice(0, 60);
}

// The widgets' titles, from the week's real artwork. Up Next's places in
// each show are made up for the picture — a visitor has no library — and
// laid out the way the widgets print them.
type Titled = { id: number; backdrop_path?: string | null; name?: string; title?: string; first_air_date?: string | null; release_date?: string | null };
const places: [number, number, number][] = [[2, 5, 8], [1, 3, 10], [3, 8, 10], [1, 2, 6], [4, 6, 12]];
const two = (n: number) => String(n).padStart(2, "0");

function upNext(list: Titled[]): WidgetTitle[] {
  return list.filter((t) => t.backdrop_path).slice(0, 5).map((t, i) => {
    const [season, episode, of] = places[i];
    return { key: `u${t.id}`, title: t.name ?? t.title ?? "", backdrop: image.still(t.backdrop_path), sub: `S${two(season)} | E${two(episode)}\u2003${episode}/${of}` };
  });
}

function films(list: Titled[]): WidgetTitle[] {
  return list.filter((t) => t.backdrop_path).slice(0, 3).map((t) => ({ key: `f${t.id}`, title: t.title ?? t.name ?? "", backdrop: image.still(t.backdrop_path), sub: (t.release_date ?? "").slice(0, 4) }));
}

/** Titles still to come, with the days until each and its date. */
function dated(list: Titled[], show = false): WidgetTitle[] {
  const today = Date.now();
  return list.filter((t) => t.backdrop_path).slice(0, 3).map((t) => {
    const when = show ? t.first_air_date : t.release_date;
    const at = when ? Date.parse(when) : NaN;
    const days = Number.isFinite(at) ? Math.max(1, Math.ceil((at - today) / 86_400_000)) : 7;
    const date = Number.isFinite(at) ? new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "";
    return { key: `d${t.id}`, title: t.name ?? t.title ?? "", backdrop: image.still(t.backdrop_path), sub: show ? "S01 | E01" : date, days };
  });
}

/** Posters for the apps' Explore rails, as the cards print them. */
function appPosters(list: Titled[]): AppPoster[] {
  return list
    .filter((t) => (t as { poster_path?: string | null }).poster_path)
    .slice(0, 3)
    .map((t) => ({ key: `p${t.id}`, title: t.name ?? t.title ?? "", year: (t.first_air_date ?? t.release_date ?? "").slice(0, 4), poster: image.poster((t as { poster_path?: string | null }).poster_path, "w342") }));
}

/** Up Next rows: real shows at made-up places, the way the app prints them. */
function appEpisodes(list: Titled[]): AppEpisode[] {
  return list.filter((t) => t.backdrop_path).slice(0, 4).map((t, i) => {
    const [season, episode, of] = places[i];
    return {
      key: `e${t.id}`,
      title: t.name ?? t.title ?? "",
      art: image.still(t.backdrop_path),
      code: `S${two(season)} | E${two(episode)}`,
      name: `Episode ${episode}`,
      left: of - episode + 1 === 1 ? "last one" : `${of - episode + 1} left`,
      progress: Math.round(((episode - 1) / of) * 100),
      badge: i === 1 ? "NEW" : undefined,
    };
  });
}

export async function Landing() {
  const region = await visitorRegion();
  const [shows, movies, bestShows, bestMovies, soonShows, soonMovies] = await Promise.all([
    showRails.trending(),
    movieRails.trending(),
    showRails.topRated(),
    movieRails.topRated(),
    showRails.anticipated(),
    movieRails.anticipated(region),
  ]);

  const trending = interleave(asMovies(movies), asShows(shows));
  // The real tracker, drawn from a made-up library of this week's shows.
  const tracker = await trackerFromArchive(sampleLibrary(shows, movies));

  return (
    // Night colours top to bottom whatever the theme, and one black for the
    // whole page, so the wall, the showcases and the bands below meet
    // without a seam.
    <div className="scheme-dark min-h-screen flex flex-col" style={{ ["--page" as string]: "#0b0c0e" }}>
      <header id="top">
        <PosterWall posters={wall([shows, movies, bestShows, bestMovies])} />
      </header>

      <main className="flex-1">
        <div id="features">
          <Showcase
            eyebrow="Explore"
            stripe="#FFCB14"
            title="Find your next favourite."
            body="What's trending this week, new episodes, what's in cinemas near you, and the best of all time. The same posters on the website and in the app."
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
              <div className="min-w-0 lg:col-span-7">
                <BrowserFrame>
                  <div className="px-4 pt-2 pb-5">
                    <Row title="Trending this week" href="/explore/rail/trending" items={trending} marks={markLookup(null)} />
                  </div>
                </BrowserFrame>
              </div>
              <div className="lg:col-span-5 flex justify-center gap-4">
                <PhoneFrame label="Kodigo's Explore tab on iPhone, with new series coming and trending shows" className="w-[46%] max-w-[250px]">
                  <ExploreScreen platform="ios" kind="shows" firstName="NEW SERIES COMING" first={appPosters(soonShows)} second={appPosters(shows.slice(3))} />
                </PhoneFrame>
                <PhoneFrame label="Kodigo's Explore tab on Android, with highly anticipated and trending films" className="w-[46%] max-w-[250px]">
                  <ExploreScreen platform="android" kind="movies" firstName="HIGHLY ANTICIPATED" first={appPosters(soonMovies)} second={appPosters(movies)} />
                </PhoneFrame>
              </div>
            </div>
          </Showcase>

          <Showcase
            eyebrow="Track"
            stripe="#FF69C4"
            title="Never lose your place."
            body="Check off an episode and the next one is waiting. Up Next, a calendar of what's airing, and stats on everything you've watched, the same on your phone and, with Kodigo Pro, on the web."
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5 flex justify-center gap-4 order-2 lg:order-1">
                <PhoneFrame label="Kodigo's Up Next on iPhone, each show at its next episode" className="w-[46%] max-w-[250px]">
                  <UpNextScreen platform="ios" episodes={appEpisodes(shows)} />
                </PhoneFrame>
                <PhoneFrame label="Kodigo's Up Next on Android, each show at its next episode" className="w-[46%] max-w-[250px]">
                  <UpNextScreen platform="android" episodes={appEpisodes(bestShows)} />
                </PhoneFrame>
              </div>
              <div className="min-w-0 lg:col-span-7 order-1 lg:order-2">
                <BrowserFrame>
                  <ScaledPage width={960} height={600}>
                    <div className="px-7 pt-6 pb-10">
                      <TrackerBoard data={tracker} picture />
                    </div>
                  </ScaledPage>
                </BrowserFrame>
              </div>
            </div>
          </Showcase>

          <Showcase
            eyebrow="Widgets"
            stripe="#38B6FF"
            title="Your shows, right on your home screen."
            body="Up Next, Coming Soon and films to watch, plus a search card, on iPhone and Android."
          >
            <div className="flex justify-center gap-4">
              <PhoneFrame label="An iPhone home screen with Kodigo's Up Next, Coming Soon, Search and To Watch widgets" className="w-[46%] max-w-[250px]">
                <IPhoneWidgets upNext={upNext(shows)} soonFilms={dated(soonMovies)} toWatch={films(bestMovies)} />
              </PhoneFrame>
              <PhoneFrame label="An Android home screen with Kodigo's Quick actions, Coming Soon and Up Next widgets and the Search tile" className="w-[46%] max-w-[250px]">
                <AndroidWidgets soonShows={dated(soonShows, true)} upNext={upNext(bestShows)} />
              </PhoneFrame>
            </div>
          </Showcase>
        </div>

        {/* The questions left once the showcases have been seen, in the
            same dress as them and the stripes carrying on in order. */}
        <Showcase
          id="import"
          eyebrow="Moving in"
          stripe="#FFCB14"
          title="Bring your history with you."
          body="Hand Kodigo the export from the app you used before. What you watched, your ratings, your lists and your reviews come across, matched title by title, and anything that couldn't be matched is listed rather than lost."
        >
          <ul className="m-0 p-0 list-none flex flex-wrap gap-2.5">
            {sources.map((s) => (
              <li key={s} className="inline-flex items-center h-11 px-5 rounded-full bg-[#202327] border border-white/15 text-[clamp(15px,1.15vw,18px)] font-semibold text-white">
                {s}
              </li>
            ))}
          </ul>
        </Showcase>

        {/* Who pays for what, said plainly: the website is free with ads, the
            apps are Kodigo Pro, and Pro takes the ads off the website too. */}
        <Showcase id="pricing" eyebrow="Free and Pro" stripe="#FF69C4" title={<>Free on the web.<br />Pro in the apps.</>}>
          <div className="grid gap-4 max-w-[760px] sm:grid-cols-2">
            {[
              { name: "Website", price: "Free, with ads", text: "Browse every show and film, rate and review, make lists and follow people. The ads keep it free." },
              { name: "Kodigo Pro", price: "$1.99 a month or $15.99 a year", text: "The iPhone app, with Android coming soon: episode tracking, Up Next, the calendar, widgets and stats. And the website with tracking and no ads." },
            ].map((plan) => (
              <div key={plan.name} className="rounded-[16px] p-2 bg-[#202327] border border-white/15 shadow-[0_4px_9px_rgba(0,0,0,.35)]">
                <div className="h-full rounded-[12px] bg-[#2a2d32] ring-1 ring-inset ring-white/10 p-[clamp(18px,1.8vw,26px)]">
                  <div className="display text-[clamp(40px,3.6vw,56px)] leading-none text-white">{plan.name}</div>
                  <div className="text-[clamp(13px,1vw,15px)] text-white/60 mt-1">{plan.price}</div>
                  <p className="text-[clamp(15px,1.2vw,18px)] text-white/75 mt-4 mb-0 leading-relaxed">{plan.text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 mb-0 text-[clamp(15px,1.15vw,18px)] text-white/65">New subscribers on iPhone get 7 days free. Pro is bought in the app.</p>
          <p className="mt-2 mb-0 text-[clamp(15px,1.15vw,18px)]">
            <Link href="/pro" className="text-white/80 hover:text-white">Everything Pro adds →</Link>
          </p>
        </Showcase>

        <Showcase id="faq" eyebrow="Questions" stripe="#38B6FF" title="Good to know.">
          <div className="max-w-[760px]">
            {faq.map(([q, a]) => (
              <details key={q} className="faq">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </Showcase>
      </main>

      <SiteFooter />
    </div>
  );
}
