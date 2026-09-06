import Link from "next/link";
import { LogoMark } from "./Logo";
import { Menu } from "./Menu";
import { Poster } from "./Poster";
import { NavSearch } from "./NavSearch";
import { AppearanceMenu } from "./AppearanceMenu";
import { optionalLibrary } from "@/lib/library";
import { upcomingEpisodes, whenLabel } from "@/lib/upcoming";
import { loadProfile } from "@/lib/profile";
import { image } from "@/lib/tmdb";
import { createClient } from "@/lib/supabase/server";
import { NavLinks } from "./NavLinks";

// Two navs in one. Signed out, the bar sells the app: the landing page's
// sections and a Sign in button. Signed in, it becomes the product: the
// library tabs on the left and, on the right, search, a bell holding the
// week's episodes, and an avatar menu that keeps everything else — account,
// themes, the marketing pages, sign out — out of the way.

const marketing: [string, string][] = [
  ["/discover", "Discover"],
  ["/shows", "Shows"],
  ["/movies", "Movies"],
  ["/#features", "Features"],
  ["/#import", "Import"],
  ["/#themes", "Themes"],
  ["/#pricing", "Pricing"],
  ["/#faq", "FAQ"],
];

const product: [string, string][] = [
  ["/discover", "Discover"],
  ["/shows", "Shows"],
  ["/movies", "Movies"],
  ["/app/lists", "My Lists"],
];

const menuLinks = [
  ["/app/lists", "My Lists"],
  ["/app/profile", "Profile"],
  ["/app/account", "Account"],
  ["/app/import", "Import a backup"],
  ["/#features", "Features"],
  ["/#pricing", "Subscription"],
  ["/#faq", "FAQ"],
  ["/support", "Support"],
];

export async function SiteNav({ overlay = false }: { overlay?: boolean } = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav
      className={overlay ? "absolute inset-x-0 top-0 z-50" : "sticky top-0 z-50 border-b border-hair"}
      style={
        overlay
          ? { background: "linear-gradient(180deg, color-mix(in srgb, var(--page) 7%, transparent), color-mix(in srgb, var(--page) 0%, transparent))" }
          : { backdropFilter: "blur(18px)", background: "color-mix(in srgb, var(--page) 82%, transparent)" }
      }
    >
      <div className="wrap flex items-center gap-6 h-16">
        <Link href={user ? "/discover" : "/"} className="flex items-center gap-2.5 no-underline">
          <LogoMark />
          <span className="display text-2xl">Kodigo</span>
        </Link>
        <div className="hidden md:flex gap-5 text-sm text-dim">
          <NavLinks links={user ? product : marketing} />
        </div>
        {user ? (
          <SignedIn email={user.email ?? ""} />
        ) : (
          <div className="ml-auto flex items-center gap-4 shrink-0">
            <NavSearch />
            <AppearanceMenu />
            <Link href="/login" className="btn ghost !py-2 !px-4 text-sm shrink-0 whitespace-nowrap">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

async function SignedIn({ email }: { email: string }) {
  const [{ archive }, profile] = await Promise.all([optionalLibrary(), loadProfile()]);
  const upcoming = await upcomingEpisodes(archive);
  const initial = ((profile.display_name || email)[0] ?? "?").toUpperCase();
  const avatar = image.poster(profile.avatar_path, "w185");

  return (
    <div className="ml-auto flex items-center gap-4 shrink-0">
      <NavSearch />

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

      <AppearanceMenu />

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
