import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeRow } from "@/components/ThemeRow";
import { LandingFrame, type FrameSlide } from "@/components/LandingFrame";
import { movieRails, showRails, image } from "@/lib/tmdb";
import { year } from "@/lib/archive";

const features = [
  ["Up next", "A queue, not a feed", "Shows waiting on you, shows you have finished, and films you have not started, each in their own run."],
  ["Ratings", "Hearts and moods", "Rate an episode out of ten and tag how it felt. Up to three moods, so a rating carries more than a number."],
  ["Stats", "Time actually spent", "Watch time across everything you have logged, broken down by show, by year, and by run length."],
  ["Home screen", "Widgets", "Your next episode on the home screen, in the accent you picked, updating as you watch."],
];

const faq = [
  ["Where is my data kept?", "On your device. If you sign in to a Kodigo account, a copy of your library is kept on Kodigo's server so your other devices and this website stay in step. Sync is optional and off until you turn it on."],
  ["Is there an Android version?", "Not yet. Android is next after the iOS launch settles, and it is a full rebuild rather than a port, so it will take a while."],
  ["Can I use it without paying?", "The trial runs for seven days with everything unlocked. After that a subscription keeps the app running."],
  ["Where does the show data come from?", "TMDB provides titles, seasons, episodes and artwork. Air times come from TVMaze, and IMDb and Rotten Tomatoes scores from OMDb."],
  ["What happens to my library if I stop subscribing?", "It stays on your device. Nothing is deleted and nothing is held hostage, and backup and export keep working."],
];

function Shot({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] bg-card border border-hair aspect-[4/3] flex items-center justify-center text-center p-6 text-[13px] text-dim">
      {children}
    </div>
  );
}

// The week's trending, shows and films taking turns, for the frame at the top.
// A failed fetch costs the carousel and nothing else — the frame still draws,
// the page still reads, because `showRails`/`movieRails` return empty rather
// than throwing.
async function frameSlides(): Promise<FrameSlide[]> {
  const [shows, movies] = await Promise.all([showRails.trending(), movieRails.trending()]);
  const out: FrameSlide[] = [];
  for (let i = 0; i < 5; i++) {
    const s = shows[i];
    if (s?.backdrop_path) out.push({ key: `s${s.id}`, backdrop: image.backdrop(s.backdrop_path)!, title: s.name, kind: "Show", year: year(s.first_air_date) });
    const m = movies[i];
    if (m?.backdrop_path) out.push({ key: `m${m.id}`, backdrop: image.backdrop(m.backdrop_path)!, title: m.title, kind: "Film", year: year(m.release_date) });
  }
  return out.slice(0, 8);
}

export default async function Home() {
  const slides = await frameSlides();

  return (
    <div className="scheme-dark min-h-screen flex flex-col">
        <SiteNav />

        <header id="top">
          <LandingFrame slides={slides}>
            <div className="grid gap-[clamp(20px,4vw,56px)] md:grid-cols-2 md:items-center">
              <div>
                <div className="mb-5">
                  <LogoMark size={48} label="Kodigo" />
                </div>
                <h1 className="!text-[clamp(34px,5.5vw,64px)] text-white drop-shadow-[0_3px_16px_rgba(0,0,0,.8)]">
                  Everything
                  <br />
                  you watch
                  <span className="block text-accent transition-colors duration-500">stays yours</span>
                </h1>
              </div>
              <div>
                <p className="text-[clamp(15px,1.4vw,17px)] max-w-[40ch] text-white/85 drop-shadow-[0_2px_10px_rgba(0,0,0,.8)] m-0">
                  Kodigo tracks your shows and films on your iPhone. Your library lives on your device, and
                  a Kodigo account carries it to your iPad and to this site when you want that.
                </p>
                <div className="flex flex-wrap gap-3 mt-7">
                  <a className="btn" href="#">Download on the App Store</a>
                  <a className="btn ghost !text-white !border-white/40" href="#import">Coming from TV Time?</a>
                </div>
              </div>
            </div>
          </LandingFrame>
        </header>

        <section id="features" className="band">
          <div className="wrap">
            <div className="rule" />
            <div className="eyebrow">What it does</div>
            <h2>
              Mark an episode in one tap
              <br />
              and get on with your evening
            </h2>
            <p className="text-[clamp(17px,2.2vw,21px)] max-w-[52ch] mt-6 text-bone">
              Your next episode sits at the top of every show, so the app opens on the thing you were
              about to do. Everything else stays out of the way until you go looking for it.
            </p>
            <div className="grid gap-4 mt-11 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
              {features.map(([tag, title, body]) => (
                <div key={title} className="card">
                  <div className="text-[11px] font-bold tracking-[.14em] uppercase text-accent transition-colors duration-500">{tag}</div>
                  <h3 className="mt-2 mb-2.5">{title}</h3>
                  <p className="text-[15px] text-dim m-0">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band">
          <div className="wrap grid gap-[clamp(28px,5vw,72px)] items-center md:grid-cols-2">
            <div>
              <div className="rule" />
              <div className="eyebrow">Local first</div>
              <h2>
                Your phone first,
                <br />
                the cloud when you ask
              </h2>
              <p className="text-dim mt-6">
                Kodigo opens straight into the app. Your library is written to your device and stays
                there. Sign in to a Kodigo account and the same library follows you to your iPad and to
                this site, and turning that on is your call.
              </p>
              <p className="text-dim">
                There is no follower count and no feed of what other people watched. The app does one
                job.
              </p>
            </div>
            <Shot>
              Library screen
              <br />
              screenshot
            </Shot>
          </div>
        </section>

        <section id="import" className="band">
          <div className="wrap grid gap-[clamp(28px,5vw,72px)] items-center md:grid-cols-2">
            <div className="md:order-2">
              <div className="rule" />
              <div className="eyebrow">Migrating</div>
              <h2>
                Bring your
                <br />
                TV Time history
              </h2>
              <p className="text-dim mt-6">
                Export your data from TV Time and hand the file to Kodigo. Zip, CSV or JSON all work,
                and the format is detected for you.
              </p>
              <p className="text-dim">
                Every title is matched against TMDB, your watched episodes come across marked, and
                anything that could not be matched is listed so you can sort it out yourself rather
                than losing it quietly.
              </p>
            </div>
            <Shot>
              Import flow
              <br />
              screenshot
            </Shot>
          </div>
        </section>

        <section id="themes" className="band">
          <div className="wrap">
            <div className="rule" />
            <div className="eyebrow">Themes</div>
            <h2>
              Eight accents.
              <br />
              Pick one and the app follows.
            </h2>
            <p className="text-[clamp(17px,2.2vw,21px)] max-w-[48ch] mt-6 text-bone">
              Each theme carries a deeper tone for light mode and a brighter one for dark, so the colour
              holds up either way. Try them here.
            </p>
            <ThemeRow />
          </div>
        </section>

        <section id="pricing" className="band">
          <div className="wrap">
            <div className="rule" />
            <div className="eyebrow">Pricing</div>
            <h2>
              One price,
              <br />
              kept simple
            </h2>
            <p className="text-[clamp(17px,2.2vw,21px)] max-w-[46ch] mt-6 text-bone">
              Seven days free, then whichever plan suits you. No charge until the trial ends, and you
              can cancel any time before then.
            </p>
            <div className="grid gap-4 mt-11 max-w-[640px] sm:grid-cols-2">
              <div className="card">
                <div className="display text-[52px] leading-none">$1.99</div>
                <div className="text-sm text-dim">per month</div>
              </div>
              <div className="card !bg-card-hi !border-accent transition-colors duration-500">
                <div className="display text-[52px] leading-none">$15.99</div>
                <div className="text-sm text-dim">per year</div>
                <div className="text-xs font-bold tracking-[.1em] uppercase text-accent mt-2.5">Four months free</div>
              </div>
            </div>
            <p className="text-sm text-dim mt-4">Prices shown in USD and converted to your local store currency by Apple.</p>
          </div>
        </section>

        <section id="faq" className="band">
          <div className="wrap">
            <div className="rule" />
            <div className="eyebrow">Questions</div>
            <h2>Good to know</h2>
            <div className="mt-9 max-w-[760px]">
              {faq.map(([q, a]) => (
                <details key={q} className="faq">
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
            <p className="text-sm text-dim mt-8">
              Already have an account? <Link href="/login" className="text-accent">Sign in to see your library</Link>.
            </p>
          </div>
        </section>

        <SiteFooter />
    </div>
  );
}
