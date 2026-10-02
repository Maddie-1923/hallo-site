import Link from "next/link";
import { accountsOpen } from "@/lib/accounts";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import { LandingFrame, type FrameSlide } from "./LandingFrame";
import { StoreButtons } from "./StoreButtons";
import { Row, asMovies, asShows, interleave } from "./TitleRows";
import { markLookup } from "@/lib/marks";
import { year } from "@/lib/archive";
import { image, movieRails, showRails } from "@/lib/tmdb";

// kodigo.pro for someone who isn't signed in (decided 2 Oct 2026): the front
// door to the whole of Kodigo, the website and the app together, drawn like
// About. Top to bottom it sells it (the hero), shows it's real (this week's
// posters), says what it's for (track, review, people), and answers the two
// questions left: can I bring my history, and what does it cost. Signed in,
// the poster home is the front page instead (app/page.tsx), and Explore keeps
// the same rows open to everyone.

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

// The billboard behind the hero: the week's trending, shows and films taking
// turns. A failed fetch costs the pictures and nothing else.
function slides(shows: Awaited<ReturnType<typeof showRails.trending>>, movies: Awaited<ReturnType<typeof movieRails.trending>>): FrameSlide[] {
  const out: FrameSlide[] = [];
  for (let i = 0; i < 5; i++) {
    const s = shows[i];
    if (s?.backdrop_path) out.push({ key: `s${s.id}`, backdrop: image.banner(s.backdrop_path)!, title: s.name, kind: "Show", year: year(s.first_air_date) });
    const m = movies[i];
    if (m?.backdrop_path) out.push({ key: `m${m.id}`, backdrop: image.banner(m.backdrop_path)!, title: m.title, kind: "Film", year: year(m.release_date) });
  }
  return out.slice(0, 8);
}

export async function Landing() {
  const [shows, movies] = await Promise.all([showRails.trending(), movieRails.trending()]);
  const trending = interleave(asMovies(movies), asShows(shows));
  const join = accountsOpen ? (
    <Link className="btn !py-2.5 !px-5 !text-[1.25rem] whitespace-nowrap" href="/login">
      Create a free account
    </Link>
  ) : (
    <Link className="btn !py-2.5 !px-5 !text-[1.25rem] whitespace-nowrap" href="/explore">
      Explore what&apos;s on
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <header id="top">
        <LandingFrame slides={slides(shows, movies)}>
          <div className="grid gap-[clamp(20px,4vw,56px)] md:grid-cols-2 md:items-end">
            <div>
              {/* The three things Kodigo is for; the accent on the last,
                  because the people are what the website adds. */}
              <h1 className="!text-[clamp(46px,7.5vw,104px)] leading-[0.86] text-white drop-shadow-[0_3px_16px_rgba(0,0,0,.8)]">
                Track
                <br />
                Review
                <span className="block text-accent transition-colors duration-500">Share</span>
              </h1>
            </div>
            <div>
              <p className="text-[clamp(16px,1.5vw,19px)] max-w-[38ch] text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,.85)] m-0">
                Every show and film you watch in one place, on your phone and here. Say what you thought, and see what the people you follow are watching.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mt-7">
                {join}
                <StoreButtons />
              </div>
            </div>
          </div>
        </LandingFrame>
      </header>

      <main className="flex-1">
        {/* The catalogue itself, one real row of it. */}
        <div className="w-full px-[clamp(16px,3.2vw,64px)] pt-6 pb-4">
          <Row title="Trending this week" href="/explore/rail/trending" items={trending} marks={markLookup(null)} />
        </div>

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
