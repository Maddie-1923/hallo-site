import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "./Logo";
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

const marketing: [string, string][] = [
  ["/", "Home"],
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

  return (
    <nav
      className={overlay ? "absolute inset-x-0 top-0 z-50" : "sticky top-0 z-50 border-b border-hair"}
      style={
        overlay
          ? { background: "linear-gradient(180deg, color-mix(in srgb, var(--page) 7%, transparent), color-mix(in srgb, var(--page) 0%, transparent))" }
          : { backdropFilter: "blur(18px)", background: "color-mix(in srgb, var(--page) 82%, transparent)" }
      }
    >
      <div className={`${framed ? "w-full px-[clamp(20px,5vw,80px)] h-20" : "wrap h-16"} flex items-center gap-6`}>
        <Link href={user ? "/discover" : "/"} className="flex items-center gap-2.5 no-underline">
          <LogoMark />
          <span className="display text-2xl">Kodigo</span>
        </Link>
        <div className="hidden md:flex gap-5 text-sm text-dim">
          <NavLinks links={user ? product : marketing} />
        </div>
        {user ? (
          <SignedIn email={user.email ?? ""} framed={framed} />
        ) : (
          <div className="ml-auto flex items-center gap-4 shrink-0">
            <SearchBoundary />
            <DayNightToggle onPicture={framed} />
            <ThemeMenu />
            {accountsOpen && (
              <Link href="/login" className="btn ghost !py-2 !px-4 text-sm shrink-0 whitespace-nowrap">
                Sign in
              </Link>
            )}
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
      <ThemeMenu />

      <Menu
        label="Account menu"
        width={240}
        button={
          <>
            <span className="w-9 h-9 rounded-lg overflow-hidden bg-accent-fill text-graphite flex items-center justify-center display text-xl">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="w-full h-full object-cover object-top" />
              ) : (
                initial
              )}
            </span>
            <span className="text-dim text-xs" aria-hidden>
              ▾
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


function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
