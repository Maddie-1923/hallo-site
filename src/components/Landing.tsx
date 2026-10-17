import Link from "next/link";
import { accountsOpen } from "@/lib/accounts";
import { SiteFooter } from "./SiteFooter";
import { PosterWall, type WallPoster } from "./PosterWall";
import { image, movieRails, showRails } from "@/lib/tmdb";

// kodigo.pro for someone who isn't signed in: the front door to the whole of
// Kodigo, the website and the app together. The first screen is the poster
// wall (components/PosterWall.tsx, after Apple TV's page, 17 Oct 2026): what
// it is in one line and the two ways in, nothing else. Below it, what it's
// for (track, review, people), and the two questions left: can I bring my
// history, and what does it cost. Signed in, the poster home is the front
// page instead (app/page.tsx), and Explore keeps the rows open to everyone.

const blocks = [
  ["Track", "Never lose your place", "Every show you're partway through in one queue, the next episode at the top, and a reminder the day a new one airs or a film you're waiting on opens."],
  ["Review", "Say what you thought", "Rate in half stars, pick a mood, and write as much or as little as you like. Spoilers stay hidden until a reader asks to see them."],
  ["People", "Find your kind of taste", "Follow friends and strangers with good taste, browse their lists, and see what they're watching this week."],
] as const;

const sources = ["Letterboxd", "Trakt", "TV Time", "IMDb", "Simkl"];

const faq = [
  ["Is Kodigo free?", "Browsing is free for everyone, and a free account lets you rate, review, make lists and follow people. Tracking what you're watching, the calendar and stats are Kodigo Pro, $1.99 a month or $15.99 a year."],
  ["Do I need the app?", "No. The website works on its own. Pro is bought in the app, and once you have it, the same library is on your phone and here."],
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

export async function Landing() {
  const [shows, movies, bestShows, bestMovies] = await Promise.all([showRails.trending(), movieRails.trending(), showRails.topRated(), movieRails.topRated()]);

  return (
    <div className="min-h-screen flex flex-col">
      <header id="top">
        <PosterWall posters={wall([shows, movies, bestShows, bestMovies])} />
      </header>

      <main className="flex-1">
        <section id="features" className="band">
          <div className="wrap">
            <div className="rule" />
            <div className="eyebrow">What it&apos;s for</div>
            <h2>
              Watch it, keep it,
              <br />
              talk about it
            </h2>
            <div className="grid gap-[clamp(24px,4vw,48px)] mt-11 md:grid-cols-3">
              {blocks.map(([tag, title, body]) => (
                <div key={tag} className="grid gap-1 content-start">
                  <div className="text-[0.9167rem] font-bold tracking-[.14em] uppercase text-accent transition-colors duration-500">{tag}</div>
                  <h3 className="m-0">{title}</h3>
                  <p className="text-[1.25rem] text-dim m-0">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="import" className="band">
          <div className="wrap grid gap-[clamp(28px,5vw,72px)] items-center md:grid-cols-2">
            <div>
              <div className="rule" />
              <div className="eyebrow">Moving in</div>
              <h2>
                Bring your
                <br />
                history with you
              </h2>
              <p className="text-dim mt-6">
                Hand Kodigo the export from the app you used before. What you watched, your ratings, your lists and your reviews come across, matched title by title, and anything that couldn&apos;t be matched is listed rather than lost.
              </p>
            </div>
            <ul className="m-0 p-0 list-none flex flex-wrap gap-2.5 md:justify-end">
              {sources.map((s) => (
                <li key={s} className="inline-flex items-center h-11 px-5 rounded-full bg-card border border-hair text-[1.25rem] font-semibold text-ink">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pricing" className="band">
          <div className="wrap">
            <div className="rule" />
            <div className="eyebrow">Free and Pro</div>
            <h2>
              Start free.
              <br />
              Go Pro to track.
            </h2>
            <div className="grid gap-4 mt-11 max-w-[53.3333rem] sm:grid-cols-2">
              <div className="card">
                <div className="display text-[4.3333rem] leading-none">Free</div>
                <p className="text-dim mt-3 mb-0">Rate, review and log what you watched. Lists, a profile, and following people.</p>
              </div>
              <div className="card !bg-card-hi !border-accent transition-colors duration-500">
                <div className="display text-[4.3333rem] leading-none">Pro</div>
                <div className="text-sm text-dim">$1.99 a month or $15.99 a year</div>
                <p className="text-dim mt-3 mb-0">Episode tracking, Up next and the calendar, stats, import and export, and no ads.</p>
              </div>
            </div>
            <p className="text-sm mt-4">
              <Link href="/pro" className="text-accent">Everything Pro adds →</Link>
            </p>
          </div>
        </section>

        <section id="faq" className="band">
          <div className="wrap">
            <div className="rule" />
            <div className="eyebrow">Questions</div>
            <h2>Good to know</h2>
            <div className="mt-9 max-w-[63.3333rem]">
              {faq.map(([q, a]) => (
                <details key={q} className="faq">
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-10">
              {accountsOpen ? (
                <>
                  <Link className="btn !py-2.5 !px-5 !text-[1.25rem]" href="/login">
                    Create a free account
                  </Link>
                  <Link className="btn ghost !py-2.5 !px-5 !text-[1.25rem]" href="/login">
                    Sign in
                  </Link>
                </>
              ) : (
                <Link className="btn !py-2.5 !px-5 !text-[1.25rem]" href="/explore">
                  Explore what&apos;s on
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
