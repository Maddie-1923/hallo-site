import Link from "next/link";
import { Suspense } from "react";
import { LogoBleed } from "./Logo";
import { Menu } from "./Menu";
import { Poster } from "./Poster";
import { NavSearch } from "./NavSearch";
import { DayNightToggle } from "./DayNightToggle";
import { ThemeMenu } from "./ThemeMenu";
import { optionalLibrary } from "@/lib/library";
import { upcomingEpisodes, whenLabel } from "@/lib/upcoming";
import { loadProfile } from "@/lib/profile";
import { image } from "@/lib/tmdb";
import { createClient } from "@/lib/supabase/server";
import { NavLinks } from "./NavLinks";
import { accountsOpen } from "@/lib/accounts";

// Two navs in one. Signed out, the bar sells the app: the landing page's
// sections and a Sign in button. Signed in, it becomes the product: the
// library tabs on the left and, on the right, search, a bell holding the
// week's episodes, and an avatar menu that keeps everything else — account,
// themes, the marketing pages, sign out — out of the way.

// No Home: the logo and wordmark are the way home.
const marketing: [string, string][] = [
  ["/explore", "Explore"],
  ["/about", "The app"],
];

// The phone's four, in the phone's order: somewhere to find things, the two
// piles you are working through, and the page that holds everything settled.
const product: [string, string][] = [
  ["/explore", "Explore"],
  ["/app/shows", "Shows"],
  ["/app/movies", "Movies"],
  ["/app/profile", "Profile"],
];

const menuLinks = [
  ["/app/profile", "Profile"],
  ["/app/history", "History"],
  ["/app/account", "Account"],
  ["/app/import", "Import a backup"],
  ["/about#themes", "Themes"],
  ["/about#pricing", "Subscription"],
  ["/about#faq", "FAQ"],
  ["/support", "Support"],
];

// `framed` is the home page's billboard: the bar sits inside the picture's
// frame, so it lines up with the billboard's words rather than the page column.
export async function SiteNav({ overlay = false, framed = false }: { overlay?: boolean; framed?: boolean } = {}) {
  // Nobody is signed in while the accounts side is closed, whatever cookie a
  // browser is still carrying: the proxy turns those requests away, so a nav
  // drawn from a stale session would offer tabs that redirect straight home.
  // Asking Supabase at all would also put a session lookup on every public
  // page for an answer the page cannot use.
  const user = accountsOpen ? await signedInUser() : null;
  const logoHeight = framed ? 70 : 54;

  return (
    <nav
      className={overlay ? "absolute inset-x-0 top-0 z-50" : "sticky top-0 z-50 border-b border-hair"}
      style={
        overlay
          ? { background: "linear-gradient(180deg, color-mix(in srgb, var(--page) 7%, transparent), color-mix(in srgb, var(--page) 0%, transparent))" }
          : { backdropFilter: "blur(18px)", background: "color-mix(in srgb, var(--page) 82%, transparent)" }
      }
    >
      {/* The bar runs the page's full width with the home billboard's gutters,
          so the logo lines up with the card's left edge and the profile
          circle with its right, the way Netflix sets its bar. */}
      <div className={`w-full ${framed ? "px-[clamp(20px,5vw,80px)] h-20" : "px-[clamp(16px,3.2vw,64px)] h-16 pt-6"} flex items-center gap-6`}>
        {/* The wordmark and Home, Explore and the rest are laid on one
            baseline by the browser itself (the row below aligns them by
            baseline), so they line up whatever the bar's height, the zoom or
            the fonts. The k hangs from the top edge of the page, its stripes
            running off it as they run off the app icon, and its foot is
            pinned to the wordmark's baseline: the display face keeps 4px
            under its letters, so the mark's bottom sits 4px up from the
            wordmark's box. It is a touch taller than the bar, so the
            stripes' tops sit past the page's edge.

            The row sits 12px below the bar's middle (the pt-6 above), which
            lets more of the stripes show over the k. The links stand on the
            bar's foot so their accent line meets its bottom edge, with 10px
            under the words, which puts the words' middle level with the
            buttons on the right. */}
        {/* On a phone the links are hidden, so nothing stands on the foot;
            11px under the wordmark puts it on the same line it has beside
            them. */}
        <div className="self-end pb-[11px] md:pb-0 flex items-baseline gap-6">
          <Link href="/" aria-label="Kodigo home" className="relative inline-flex no-underline" style={{ paddingLeft: (logoHeight * 528) / 1185 + 10 }}>
            <span className="absolute left-0 bottom-[4px]">
              <LogoBleed height={logoHeight} />
            </span>
            <span className="display text-2xl leading-none">Kodigo</span>
          </Link>
          <div className="hidden md:flex items-baseline gap-5 text-sm text-dim">
            <NavLinks links={user ? product : marketing} />
          </div>
        </div>
        {user ? (
          <SignedIn email={user.email ?? ""} framed={framed} />
        ) : (
          // The buttons are centred on the k on the left (the middle of the
          // mark itself, 7px above the row's middle).
          <div className="ml-auto flex items-center gap-4 shrink-0 -translate-y-[7px]">
            <SearchBoundary />
            <DayNightToggle onPicture={framed} />
            <ThemeMenu onPicture={framed} />
            <GuestProfile framed={framed} />
          </div>
        )}
      </div>
    </nav>
  );
}

// `NavSearch` reads the query string, and a component that does that has to sit
// behind a boundary or the page it is on cannot be rendered ahead of time.
//
// It never had to before, and not because it was correct: every page drawing
// this nav was dynamic, since the nav asked Supabase who was signed in and that
// reads a cookie. Closing the accounts side took the cookie read away, the
// public pages became static, and the build stopped on the rule that had been
// there all along. The boundary is the fix rather than making the pages dynamic
// again — a privacy policy should be served from the edge, not rendered per
// request to draw a search box.
function SearchBoundary() {
  return (
    <Suspense fallback={<span className="w-[22px]" />}>
      <NavSearch />
    </Suspense>
  );
}

async function signedInUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function SignedIn({ email, framed }: { email: string; framed: boolean }) {
  const [{ archive }, profile] = await Promise.all([optionalLibrary(), loadProfile()]);
  const upcoming = await upcomingEpisodes(archive);
  const initial = ((profile.display_name || email)[0] ?? "?").toUpperCase();
  const avatar = image.poster(profile.avatar_path, "w185");

  return (
    <div className="ml-auto flex items-center gap-4 shrink-0">
      <SearchBoundary />

      <Menu
        label="Upcoming episodes"
        width={340}
        button={
          <span className="relative block">
            <BellIcon />
            {upcoming.length > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-movies text-graphite text-[11px] font-bold leading-[18px] text-center">
                {upcoming.length}
              </span>
            )}
          </span>
        }
      >
        <div className="px-4 pt-3 pb-2 text-[11px] font-bold tracking-[.14em] uppercase text-dim">This week</div>
        {upcoming.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-dim m-0">
            {archive
              ? "Nothing airing in the next seven days from what you're watching."
              : "Add shows to your library and their next episodes show up here."}
          </p>
        ) : (
          <ul className="m-0 p-0 list-none max-h-[420px] overflow-y-auto">
            {upcoming.map((u) => (
              <li key={u.show.id}>
                <Link href={`/show/${u.show.id}`} className="flex gap-3 px-4 py-2.5 hover:bg-card-hi no-underline text-ink">
                  <div className="w-9 shrink-0">
                    <Poster path={u.show.poster_path} alt="" className="!rounded-md" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight truncate">{u.show.name}</div>
                    <div className="text-xs text-dim mt-0.5 truncate">
                      S{u.episode.season_number} E{u.episode.episode_number} · {u.episode.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: u.inDays === 0 ? "var(--accent)" : "var(--dim)" }}>
                      {whenLabel(u.inDays)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Menu>

      <DayNightToggle onPicture={framed} />
      <ThemeMenu onPicture={framed} />

      <Menu
        label="Account menu"
        width={240}
        button={
          <>
            {/* A circle the height of the day/night pill, like the brush
                beside it. */}
            <span className="w-9 h-9 rounded-full overflow-hidden border border-hair bg-accent-fill text-on-accent flex items-center justify-center display text-xl">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="w-full h-full object-cover object-top" />
              ) : (
                initial
              )}
            </span>
          </>
        }
      >
        <div className="px-4 pt-3 pb-2 text-xs text-dim truncate border-b border-hair">{email}</div>
        <ul className="m-0 p-0 py-1 list-none">
          {menuLinks.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="block px-4 py-2 text-sm hover:bg-card-hi no-underline text-ink">
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <form action="/auth/signout" method="post" className="border-t border-hair">
          <button
            type="submit"
            className="w-full text-left px-4 py-2.5 text-sm text-dim hover:bg-card-hi hover:text-ink cursor-pointer"
          >
            Sign out
          </button>
        </form>
      </Menu>
    </div>
  );
}


// The profile circle for somebody not signed in: the same size and shell as
// the paintbrush beside it, holding a person glyph. It opens a small panel
// rather than going straight to a page, because while the accounts side is
// closed there is no sign-in page to go to, and the circle still has to say
// something when pressed.
function GuestProfile({ framed }: { framed: boolean }) {
  const shell = framed ? "bg-black/35 border-white/25 backdrop-blur-md text-white" : "bg-card border-hair text-ink";
  return (
    <Menu
      label="Profile"
      width={260}
      button={
        <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${shell}`}>
          <PersonIcon />
        </span>
      }
    >
      {accountsOpen ? (
        <div className="p-4 grid gap-3">
          <p className="m-0 text-sm text-dim">Sign in to keep your diary, ratings, reviews and lists here and on your phone.</p>
          <Link href="/login" className="btn !py-2 !px-4 text-sm justify-center">
            Sign in
          </Link>
        </div>
      ) : (
        <div className="p-4 grid gap-3">
          <p className="m-0 text-sm text-dim">
            Kodigo accounts on the web are coming soon. Your profile, diary, reviews and lists will live here.
          </p>
          <Link href="/about" className="btn ghost !py-2 !px-4 text-sm justify-center">
            Get the app meanwhile
          </Link>
        </div>
      )}
      {/* Development only: the way into the profile page before accounts
          exist. Never drawn in a build that ships. */}
      {process.env.NODE_ENV === "development" && (
        <div className="border-t border-hair py-1">
          <div className="px-4 pt-2 pb-1 text-[10.5px] font-bold tracking-[.14em] uppercase text-dim">Preview</div>
          <Link href="/u/preview" className="block px-4 py-2 text-sm hover:bg-card-hi no-underline text-ink">
            Your profile (from your library)
          </Link>
          <Link href="/u/sample" className="block px-4 py-2 text-sm hover:bg-card-hi no-underline text-ink">
            Sample profile
          </Link>
        </div>
      )}
    </Menu>
  );
}

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
