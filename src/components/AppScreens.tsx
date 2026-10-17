// The apps' Explore and Shows tabs, drawn in HTML from the apps' own layout
// (Theme.swift's Slate night palette, DiscoverView's header and poster cards,
// MyShowsView's Up Next rows, the floating tab bar) and filled with this
// week's real posters, for the front door's showcases. iPhone and Android
// share the design; the Android tab bar is solid where the iPhone's is glass.

import { Screen, u } from "./WidgetHomes";

const C = {
  page: "#17191C",
  well: "#202327",
  piece: "#33373D",
  card: "#2A2D32",
  hair: "#464B53",
  lit: "#4F555F",
  ink: "#EEEFF2",
  mid: "#BABEC4",
  dim: "#8C9097",
  accent: "#88BBBE",
  track: "#2C3035",
};

export interface AppPoster {
  key: string;
  title: string;
  year: string;
  poster: string | null;
}

export interface AppEpisode {
  key: string;
  title: string;
  art: string | null;
  code: string;
  name: string;
  left: string;
  progress: number;
  badge?: string;
}

/** The well card every row and card sits on. */
function Well({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        background: C.well,
        borderRadius: u(16),
        padding: u(8),
        boxShadow: `0 ${u(4)} ${u(9)} rgba(0,0,0,.55), inset 0 ${u(0.5)} 0 ${C.lit}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const display = (size: number) => ({ fontFamily: "var(--font-display)", fontSize: u(size), lineHeight: 1, letterSpacing: u(0.5) });

/** A key on a piece: 40 or 44 tall, radius 10, a dim glyph. */
function Key({ h = 40, w, children }: { h?: number; w?: number; children: React.ReactNode }) {
  return (
    <span className="grid place-items-center" style={{ height: u(h), width: w ? u(w) : undefined, flex: w ? "none" : 1, borderRadius: u(10), background: C.piece, color: C.dim }}>
      <svg viewBox="0 0 24 24" style={{ width: u(18), height: u(18) }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </span>
  );
}

const glyph = {
  more: <path d="M5.5 12h.01M12 12h.01M18.5 12h.01" strokeWidth="3.2" />,
  plus: <path d="M12 5v14M5 12h14" />,
  recap: <path d="M4 6.5h16v9H9l-4 3.5v-3.5H4zM8 10.5h3M13 10.5h3M8 13h8" />,
  skip: <path d="M5 6l9 6-9 6zM18 6v12" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  browse: <path d="M4 7h16M7 12h10M10 17h4" />,
  genre: <path d="M4 9h16v10H4zM4 9l2.5-4h3L7 9M11 5h3l-2.5 4M16.5 5h3L17 9" />,
  filter: <path d="M4 9.5l3-5h10l3 5M4 9.5h16v9H4zM4 13.5h5l1 2h4l1-2h5" />,
  list: <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" strokeWidth="2.4" />,
  arrow: <path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" />,
};

/** The page header: a well card with the two big tabs and the pile or rail heading. */
function Header({ tabs, live, heading, arrow, keys, narrow = false }: { tabs: [string, string]; live: 0 | 1; heading: string; arrow: boolean; keys: (keyof typeof glyph)[]; narrow?: boolean }) {
  // The Android screen is 18 points narrower; a long tab name steps down a
  // size there rather than breaking onto a second line.
  const tabSize = narrow && tabs.some((t) => t.length > 8) ? 34 : 38;
  return (
    <Well style={{ margin: `${u(8)} ${u(16)} 0` }}>
      <div className="grid grid-cols-2" style={{ gap: u(8) }}>
        {tabs.map((t, i) => (
          <span key={t} className="text-center whitespace-nowrap" style={{ ...display(tabSize), padding: `${u(5)} ${u(10)} ${u(3)}`, borderRadius: u(12), background: i === live ? C.accent : C.piece, color: i === live ? C.card : C.dim }}>
            {t}
          </span>
        ))}
      </div>
      <div className="flex items-center" style={{ gap: u(8), marginTop: u(8) }}>
        <span className="flex items-center" style={{ height: u(44), padding: `0 ${u(14)}`, borderRadius: u(10), background: C.piece, color: C.ink, gap: u(6), ...display(24) }}>
          <span style={{ paddingTop: u(3) }}>{heading}</span>
          {arrow && (
            <svg viewBox="0 0 24 24" style={{ width: u(13), height: u(13), color: C.dim }} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {glyph.arrow}
            </svg>
          )}
        </span>
        <span className="flex-1" />
        {keys.map((k) => (
          <Key key={k} h={44} w={44}>
            {glyph[k]}
          </Key>
        ))}
      </div>
    </Well>
  );
}

/** A rail's heading plate. */
function Plate({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center" style={{ height: u(44), padding: `0 ${u(14)}`, borderRadius: u(10), background: C.piece, color: C.ink, gap: u(6), ...display(24) }}>
      <span style={{ paddingTop: u(3) }}>{children}</span>
      <svg viewBox="0 0 24 24" style={{ width: u(13), height: u(13), color: C.dim }} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {glyph.arrow}
      </svg>
    </span>
  );
}

/** Explore's poster card: the poster and its words on a piece, the More and Add keys under it. */
function PosterCard({ p }: { p: AppPoster }) {
  return (
    <Well style={{ width: u(166), flex: "none" }}>
      <div className="overflow-hidden" style={{ background: C.piece, borderRadius: u(12) }}>
        <div className="relative" style={{ height: u(225), borderRadius: `${u(12)} ${u(12)} ${u(8)} ${u(8)}`, overflow: "hidden", background: C.card }}>
          {p.poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.poster} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>
        <div style={{ padding: `${u(10)} ${u(10)} ${u(4)}` }}>
          <div className="truncate font-semibold" style={{ fontSize: u(12), color: C.ink }}>{p.title}</div>
          <div className="truncate" style={{ fontSize: u(12), color: C.dim, marginTop: u(2) }}>{p.year || " "}</div>
        </div>
      </div>
      <div className="flex" style={{ gap: u(8), marginTop: u(8) }}>
        <Key>{glyph.more}</Key>
        <Key>{glyph.plus}</Key>
      </div>
    </Well>
  );
}

function Strip({ posters }: { posters: AppPoster[] }) {
  return (
    <div className="flex" style={{ gap: u(12), padding: `0 ${u(16)}` }}>
      {posters.slice(0, 3).map((p) => (
        <PosterCard key={p.key} p={p} />
      ))}
    </div>
  );
}

/** One Up Next row: the backdrop and the episode on a piece, the four keys under it. */
function EpisodeRow({ e }: { e: AppEpisode }) {
  return (
    <Well>
      <div className="flex overflow-hidden" style={{ height: u(100), background: C.piece, borderRadius: u(12) }}>
        <div className="relative shrink-0 overflow-hidden" style={{ width: u(153), borderRadius: u(12), boxShadow: `inset 0 0 0 ${u(1)} ${C.hair}`, background: C.card }}>
          {e.art && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.art} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {e.badge && (
            <span className="absolute inset-x-0 bottom-0 text-center font-bold" style={{ fontSize: u(11), letterSpacing: u(0.4), padding: `${u(2)} 0`, background: "#D9BC52", color: "#3D2F00" }}>
              {e.badge}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col" style={{ padding: `${u(10)} ${u(8)} ${u(8)} ${u(12)}` }}>
          <div className="truncate font-semibold" style={{ fontSize: u(15), color: C.ink }}>{e.title}</div>
          <div style={{ fontSize: u(15), color: C.mid, marginTop: u(2) }}>{e.code}</div>
          <div className="truncate" style={{ fontSize: u(15), color: C.dim, marginTop: u(1) }}>{e.name}</div>
          <div className="mt-auto flex items-center" style={{ gap: u(8) }}>
            <span className="flex-1 overflow-hidden" style={{ height: u(4), borderRadius: u(4), background: C.track }}>
              <span className="block h-full" style={{ width: `${e.progress}%`, background: C.accent }} />
            </span>
            <span style={{ fontSize: u(12), color: C.dim }}>{e.left}</span>
          </div>
        </div>
      </div>
      <div className="flex" style={{ gap: u(8), marginTop: u(8) }}>
        <Key>{glyph.more}</Key>
        <Key>{glyph.recap}</Key>
        <Key>{glyph.skip}</Key>
        <Key>{glyph.check}</Key>
      </div>
    </Well>
  );
}

const tabIcons = {
  shows: <path d="M4 7h16v11H4zM9 21h6M8.5 3.5L12 7l3.5-3.5" />,
  movies: <path d="M4 6h16v12H4zM8 6v12M16 6v12M4 10h4M4 14h4M16 10h4M16 14h4" />,
  explore: <path d="M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18zM15.5 8.5l-2 5-5 2 2-5z" />,
  community: <path d="M9 11a3.2 3.2 0 1 0 0-6.4a3.2 3.2 0 0 0 0 6.4zM3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5M16 11a2.7 2.7 0 1 0 0-5.4M17.5 14.2c1.7.5 2.8 2.2 3 4.8" />,
  profile: <path d="M12 12a3.8 3.8 0 1 0 0-7.6a3.8 3.8 0 0 0 0 7.6zM5 20c.8-3.6 3.6-6 7-6s6.2 2.4 7 6" />,
};

/** The floating tab bar, glass on iPhone and solid on Android. */
function TabBar({ live, glass }: { live: keyof typeof tabIcons; glass: boolean }) {
  const names: Record<keyof typeof tabIcons, string> = { shows: "Shows", movies: "Movies", explore: "Explore", community: "Community", profile: "Profile" };
  return (
    <div
      className="absolute grid grid-cols-5"
      style={{
        left: u(16),
        right: u(16),
        bottom: u(40),
        height: u(64),
        borderRadius: u(32),
        padding: u(3.5),
        background: glass ? "rgba(42,45,50,.72)" : C.card,
        backdropFilter: glass ? "blur(14px)" : undefined,
        boxShadow: `inset 0 0 0 ${u(1)} ${C.hair}, 0 ${u(3)} ${u(8)} rgba(0,0,0,.18)`,
      }}
    >
      {(Object.keys(tabIcons) as (keyof typeof tabIcons)[]).map((k) => (
        <span key={k} className="flex flex-col items-center justify-center" style={{ borderRadius: u(30), background: k === live ? C.accent : undefined, color: k === live ? C.card : C.dim }}>
          <svg viewBox="0 0 24 24" style={{ width: u(20), height: u(20) }} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {tabIcons[k]}
          </svg>
          <span style={{ fontSize: u(10), marginTop: u(3) }}>{names[k]}</span>
        </span>
      ))}
    </div>
  );
}

/** Explore's floating search field, just above the tab bar. */
function SearchField({ glass }: { glass: boolean }) {
  return (
    <div
      className="absolute flex items-center"
      style={{
        left: u(16),
        right: u(16),
        bottom: u(110),
        height: u(48),
        borderRadius: u(24),
        padding: `0 ${u(20)}`,
        gap: u(10),
        background: glass ? "rgba(42,45,50,.72)" : C.card,
        backdropFilter: glass ? "blur(14px)" : undefined,
        boxShadow: `inset 0 0 0 ${u(1)} ${C.hair}`,
        color: C.dim,
      }}
    >
      <svg viewBox="0 0 24 24" style={{ width: u(18), height: u(18) }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5L20 20" />
      </svg>
      <span style={{ fontSize: u(17) }}>Search titles and people</span>
    </div>
  );
}

export function ExploreScreen({ platform, kind, first, firstName, second }: { platform: "ios" | "android"; kind: "shows" | "movies"; first: AppPoster[]; firstName: string; second: AppPoster[] }) {
  const ios = platform === "ios";
  return (
    <Screen points={ios ? 430 : 412} background={C.page}>
      <Header tabs={["SHOWS", "MOVIES"]} live={kind === "shows" ? 0 : 1} heading={firstName} arrow keys={["browse"]} narrow={!ios} />
      <div style={{ marginTop: u(14) }}>
        <Strip posters={first} />
      </div>
      <div style={{ margin: `${u(18)} ${u(16)} ${u(12)}` }}>
        <Plate>TRENDING</Plate>
      </div>
      <Strip posters={second} />
      <SearchField glass={ios} />
      <TabBar live="explore" glass={ios} />
    </Screen>
  );
}

export function UpNextScreen({ platform, episodes }: { platform: "ios" | "android"; episodes: AppEpisode[] }) {
  const ios = platform === "ios";
  return (
    <Screen points={ios ? 430 : 412} background={C.page}>
      <Header tabs={["SHOWS", "COMING SOON"]} live={0} heading="UP NEXT" arrow={false} keys={["genre", "filter", "list"]} narrow={!ios} />
      <div className="flex flex-col" style={{ gap: u(12), padding: `${u(12)} ${u(16)} 0` }}>
        {episodes.slice(0, 4).map((e) => (
          <EpisodeRow key={e.key} e={e} />
        ))}
      </div>
      <TabBar live="shows" glass={ios} />
    </Screen>
  );
}
