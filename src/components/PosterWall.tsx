import Link from "next/link";
import { accountsOpen } from "@/lib/accounts";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/stores";
import { LogoMark } from "./Logo";
import { AndroidMark, AppleMark } from "./StoreIcons";

// The signed-out front door (Laura, 17 Oct 2026): one screen, a wall of this
// week's posters laid like tickets, one line saying what Kodigo is, and the
// three ways in — the App Store, Google Play, and the website — each on the app's shell.
// Everything that explains more sits below the fold.
//
// Dark whatever the theme, like the frame it replaced: the posters are the
// colour, and a Bone page under them would wash the wall out.

export interface WallPoster {
  key: string;
  src: string;
  title: string;
}

const ROWS = 6;

/** The wall's rows, each long enough to run off both edges once tilted. */
function rows(posters: WallPoster[]) {
  const per = Math.max(8, Math.ceil(posters.length / ROWS));
  return Array.from({ length: ROWS }, (_, r) => {
    const row = posters.slice(r * per, r * per + per);
    // A short last row borrows from the front rather than leaving a gap.
    return row.length < per ? [...row, ...posters.slice(0, per - row.length)] : row;
  });
}

/** The web's mark on its key, drawn at the store marks' size. */
function Globe() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19" />
      <path d="M12 2.5c2.6 2.7 4 6 4 9.5s-1.4 6.8-4 9.5c-2.6-2.7-4-6-4-9.5s1.4-6.8 4-9.5z" />
    </svg>
  );
}

export function PosterWall({ posters }: { posters: WallPoster[] }) {
  // The logo's three stripes, one per way in.
  const ways = [
    { title: "App Store", line: "For iPhone", action: "Download", href: APP_STORE_URL, external: true, stripe: "#FFCB14", mark: <AppleMark size={24} /> },
    { title: "Google Play", line: "For Android", action: "Soon", href: PLAY_STORE_URL, external: true, stripe: "#FF69C4", mark: <AndroidMark size={24} /> },
    accountsOpen
      ? { title: "Web", line: "Free to rate and review", action: "Create Account", href: "/login", external: false, stripe: "#38B6FF", mark: <Globe /> }
      : { title: "Web", line: "Browse it all, free", action: "Explore", href: "/explore", external: false, stripe: "#38B6FF", mark: <Globe /> },
  ];

  return (
    <section className="relative isolate overflow-hidden min-h-[100svh] flex flex-col bg-[#0b0c0e] text-white" style={{ ["--logo-ink" as string]: "#f3f0e8" }}>
      {/* The wall. Decoration only, hidden from screen readers: fifty
          posters read out one by one would be noise before the headline. */}
      <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute left-1/2 top-[-4%] -translate-x-1/2 w-[160vw] flex flex-col gap-[6px]">
          {rows(posters).map((row, r) => (
            <div key={r} className={`poster-wall-row flex gap-[4px] ${r % 2 ? "poster-wall-row-back ml-[calc(clamp(130px,13vw,240px)/-2)]" : ""}`}>
              {[...row, ...row].map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${p.key}-${i}`}
                  src={p.src}
                  alt=""
                  decoding="async"
                  className="ticket shrink-0 w-[clamp(130px,13vw,240px)] aspect-[2/3] object-cover bg-white/5"
                />
              ))}
            </div>
          ))}
        </div>
        {/* Dark enough at the bottom left for white type, and fading to the
            page's own colour at the very foot so the next band starts clean. */}
        {/* A soft pool of light across the middle, the corners falling off
            into the dark, as on a ticket wall under one lamp. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_62%_38%,transparent_0%,rgba(11,12,14,.55)_60%,rgba(11,12,14,.9)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,#0b0c0e_6%,rgba(11,12,14,.85)_30%,transparent_60%)]" />
      </div>

      <div className="flex items-center justify-between px-[clamp(16px,3.2vw,64px)] pt-5">
        <Link href="/" className="flex items-center gap-2.5 text-white no-underline" aria-label="Kodigo home">
          <LogoMark size={22} />
          <span className="display text-[clamp(22px,1.8vw,30px)] leading-none tracking-[.02em]">Kodigo</span>
        </Link>
        <nav className="flex items-center gap-[clamp(16px,2vw,32px)] text-[clamp(15px,1.15vw,19px)] font-semibold">
          <Link href="/explore" className="text-white/85 hover:text-white no-underline">
            Explore
          </Link>
          {accountsOpen && (
            <Link href="/login" className="text-white/85 hover:text-white no-underline">
              Sign in
            </Link>
          )}
        </nav>
      </div>

      <div className="mt-auto px-[clamp(16px,3.2vw,64px)] pb-[clamp(20px,3.5vw,48px)]">
        <h1 className="!text-[clamp(38px,5.6vw,84px)] !leading-[0.95] text-white m-0 max-w-[16ch] drop-shadow-[0_3px_16px_rgba(0,0,0,.7)]">
          Every show and film you watch. All on Kodigo.
        </h1>
        <p className="text-[clamp(17px,1.7vw,24px)] font-semibold text-white/90 mt-4 mb-0 max-w-[40ch]">
          Track every episode, rate and review what you&apos;ve seen, and see what your friends are watching.
        </p>

        {/* Three ways in, each in the app's shell: the raised well, and on
            it the pieces — the platform's mark on a key in one of the logo's
            stripes, the words, and the action on a key of its own. Night
            colours whatever the theme, as the wall behind them is. */}
        <ul className="list-none m-0 p-0 mt-[clamp(20px,3vw,40px)] grid gap-2.5 md:grid-cols-3 md:gap-4">
          {ways.map((w) => {
            // One size for everything on every shell, so the three read as a
            // set: the same height, a square key, an action key of one width.
            const body = (
              <>
                <span className="grid place-items-center h-full aspect-square shrink-0 rounded-[12px] text-[#111] ring-1 ring-inset ring-black/15" style={{ background: w.stripe }}>
                  {w.mark}
                </span>
                <span className="flex-1 min-w-0 px-1">
                  <span className="block truncate text-[clamp(15px,1.25vw,20px)] font-bold leading-tight">{w.title}</span>
                  <span className="block truncate text-[clamp(13px,0.95vw,15px)] text-white/65 leading-snug mt-0.5">{w.line}</span>
                </span>
                <span
                  className={`shrink-0 h-full w-[clamp(118px,9.5vw,156px)] grid place-items-center rounded-[12px] ring-1 ring-inset ring-white/10 display text-[clamp(16px,1.25vw,20px)] leading-none tracking-[.04em] ${
                    w.href ? "bg-[#33373d] text-white group-hover/way:bg-[#3d4249]" : "bg-[#2a2d32] text-white/40"
                  }`}
                >
                  {w.action}
                </span>
              </>
            );
            const box =
              "group/way flex items-stretch gap-2.5 p-2 h-[clamp(64px,5.4vw,80px)] rounded-[16px] bg-[#202327]/95 border border-white/15 shadow-[0_4px_9px_rgba(0,0,0,.35)] backdrop-blur-md text-white no-underline";
            return (
              <li key={w.title}>
                {w.href ? (
                  w.external ? (
                    <a href={w.href} className={box}>
                      {body}
                    </a>
                  ) : (
                    <Link href={w.href} className={box}>
                      {body}
                    </Link>
                  )
                ) : (
                  <div className={box} aria-disabled="true">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <a href="#features" className="block w-fit mx-auto mt-4 text-white/60 hover:text-white no-underline" aria-label="More about Kodigo">
          <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden>
            <path d="M2 2l12 8 12-8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </section>
  );
}
