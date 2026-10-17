// The widgets showcase: an iPhone and an Android home screen with Kodigo's
// widgets on them, drawn in HTML from the apps' own widget specs (colours,
// sizes, the "S02 | E01" code, the tick and the countdown badge) and filled
// with this week's real artwork, so the pictures never need retaking.
//
// Everything is laid out in the phone's own points: the screen is a
// container, and `u(n)` is n points of a 430-point-wide iPhone (or a
// 412-dp-wide Android) at whatever width the frame is drawn.

const SLATE = "#2B3138";
const ACCENT = "#88BBBE"; // Coldy, the default theme, at night
const INK2 = "rgba(255,255,255,.62)";

export interface WidgetTitle {
  key: string;
  title: string;
  backdrop: string | null;
  /** The second line: "S02 | E01   3/8", a year, or a date. */
  sub: string;
  /** Days until it lands, for the Coming Soon cards. */
  days?: number;
}

export const u = (n: number) => `calc(var(--u) * ${n})`;

/** The widget card: slate, a 16-point continuous corner, a black hairline. */
function Card({ w, h, children, className = "" }: { w: number; h: number; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden text-white ${className}`}
      style={{ width: u(w), height: u(h), background: SLATE, borderRadius: u(22), boxShadow: `inset 0 0 0 ${u(1)} rgba(0,0,0,.35)` }}
    >
      {children}
    </div>
  );
}

/** A backdrop, cropped from the top, or the accent field when there's none. */
function Band({ src, radius = 0, scrim = false, className = "", style, children }: { src: string | null; radius?: number; scrim?: boolean; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ borderRadius: radius ? u(radius) : undefined, background: ACCENT, ...style }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-top" />
      )}
      {src && scrim && <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,.8))" }} />}
      {children}
    </div>
  );
}

/** The check-off tick: a near-white disc with a dark check. */
function Tick({ size = 22 }: { size?: number }) {
  return (
    <span className="grid place-items-center rounded-full shrink-0" style={{ width: u(size), height: u(size), background: "rgba(255,255,255,.92)", boxShadow: `0 ${u(1)} ${u(2)} rgba(0,0,0,.25)` }}>
      <svg viewBox="0 0 24 24" style={{ width: u(size * 0.6), height: u(size * 0.6) }} fill="none" stroke="#121212" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

/** The countdown badge in a corner: "3d", or "TODAY". */
function Badge({ days }: { days: number }) {
  return (
    <span
      className="inline-grid place-items-center rounded-full font-black text-[#121212]"
      style={{ minWidth: u(22), height: u(22), padding: `0 ${u(5.5)}`, fontSize: u(days ? 11 : 8.5), background: "rgba(255,255,255,.92)", boxShadow: `0 ${u(1)} ${u(2)} rgba(0,0,0,.25)` }}
    >
      {days ? `${days}d` : "TODAY"}
    </span>
  );
}

const kicker = (color = INK2) => ({ fontSize: u(8.5), letterSpacing: u(1.2), color, fontWeight: 900 });

/** Large: a lead band over four rows. */
function Large({ kind, items, w = 364, h = 382 }: { kind: "UP NEXT" | "TO WATCH"; items: WidgetTitle[]; w?: number; h?: number }) {
  const [lead, ...rest] = items;
  return (
    <Card w={w} h={h} className="flex flex-col">
      <Band src={lead?.backdrop ?? null} scrim className="flex-1">
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-[6px]" style={{ padding: `${u(10)} ${u(18)}` }}>
          <div className="flex-1 min-w-0" style={{ display: "grid", gap: u(2) }}>
            <div style={kicker("#fff")}>{kind}</div>
            <div className="font-bold leading-tight line-clamp-2" style={{ fontSize: u(16) }}>{lead?.title}</div>
            <div className="font-medium" style={{ fontSize: u(11), color: "rgba(255,255,255,.8)" }}>{lead?.sub}</div>
          </div>
          <Tick />
        </div>
      </Band>
      <div className="flex flex-col" style={{ padding: `${u(13)} ${u(18)}`, gap: u(13) }}>
        {rest.slice(0, 4).map((it, i) => (
          <div key={it.key} className="relative flex items-center" style={{ height: u(40), gap: u(9) }}>
            {i > 0 && <span className="absolute right-0" style={{ left: u(78), top: u(-7), height: u(1), background: "rgba(255,255,255,.14)" }} />}
            <Band src={it.backdrop} radius={8} style={{ width: u(69), height: u(40), flex: "none" }}>
              {kind === "UP NEXT" && (
                <span className="absolute inset-x-0 bottom-0" style={{ height: u(3), background: "rgba(0,0,0,.55)" }}>
                  <span className="block h-full" style={{ width: `${30 + ((i * 23) % 60)}%`, background: ACCENT }} />
                </span>
              )}
            </Band>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate" style={{ fontSize: u(13) }}>{it.title}</div>
              <div className="font-medium truncate" style={{ fontSize: u(11), marginTop: u(2), color: "rgba(255,255,255,.85)" }}>{it.sub}</div>
            </div>
            <Tick />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Medium: three columns, a shelf, no lead band. */
function Medium({ kind, items, w = 364, h = 170, countdown = false }: { kind: string; items: WidgetTitle[]; w?: number; h?: number; countdown?: boolean }) {
  return (
    <Card w={w} h={h}>
      <div style={{ padding: `${u(14)} ${u(18)} ${u(2)}` }}>
        <div style={{ ...kicker("#fff"), lineHeight: u(9) }}>{kind}</div>
        <div className="grid grid-cols-3" style={{ gap: u(8), marginTop: u(12) }}>
          {items.slice(0, 3).map((it) => (
            <div key={it.key} className="min-w-0 text-center">
              <Band src={it.backdrop} radius={8} style={{ aspectRatio: "9 / 8" }}>
                <span className="absolute" style={{ right: u(3), bottom: u(3) }}>{countdown ? <Badge days={it.days ?? 3} /> : <Tick />}</span>
              </Band>
              <div className="font-black truncate" style={{ fontSize: u(11), marginTop: u(5) }}>{it.title}</div>
              <div className="font-medium truncate" style={{ fontSize: u(9.5), color: INK2 }}>{it.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/** Small: the band, the badge in its corner, three lines under it. */
function Small({ kind, item, size = 170 }: { kind: string; item: WidgetTitle | undefined; size?: number }) {
  return (
    <Card w={size} h={size} className="flex flex-col">
      <Band src={item?.backdrop ?? null} className="flex-1">
        <span className="absolute" style={{ right: u(7), bottom: u(7) }}><Badge days={item?.days ?? 3} /></span>
      </Band>
      <div style={{ padding: `${u(6)} ${u(18)}`, display: "grid", gap: u(1) }}>
        <div style={kicker()}>{kind}</div>
        <div className="font-black truncate" style={{ fontSize: u(12) }}>{item?.title}</div>
        <div className="font-medium truncate" style={{ fontSize: u(10.5), color: INK2 }}>{item?.sub}</div>
      </div>
    </Card>
  );
}

/** The iOS Search card. */
function SearchCard({ size = 170 }: { size?: number }) {
  return (
    <Card w={size} h={size} className="flex flex-col" >
      <div className="flex flex-col h-full" style={{ padding: u(18) }}>
        <svg viewBox="0 0 24 24" style={{ width: u(22), height: u(22) }} fill="none" stroke={ACCENT} strokeWidth="2.6" strokeLinecap="round" aria-hidden>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5L20 20" />
        </svg>
        <div className="mt-auto display leading-none" style={{ fontSize: u(28) }}>SEARCH</div>
        <div className="font-medium" style={{ fontSize: u(12), marginTop: u(2), color: INK2 }}>Shows and films</div>
      </div>
    </Card>
  );
}

/** Android's Search tile: the navy squircle with the icon's stripes. */
function AndroidSearchTile({ size }: { size: number }) {
  return (
    <div className="relative overflow-hidden grid place-items-center" style={{ width: u(size), height: u(size), borderRadius: u(size * 0.3), background: "#14213D" }}>
      <span className="absolute inset-y-0 left-0" style={{ width: "12.5%", background: "#F5C53B" }} />
      <span className="absolute inset-y-0" style={{ left: "12.5%", width: "4.2%", background: "#E868B9" }} />
      <span className="absolute inset-y-0" style={{ left: "16.7%", width: "4.3%", background: "#58AEFF" }} />
      <div className="relative flex flex-col items-center" style={{ marginLeft: u(size * 0.105), marginBottom: u(size * 0.1), color: "#F3F0E8" }}>
        <svg viewBox="0 0 24 24" style={{ width: u(size * 0.36), height: u(size * 0.36) }} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5L20 20" />
        </svg>
        <span className="display leading-none" style={{ fontSize: u(size * 0.153), marginTop: u(size * 0.03) }}>SEARCH</span>
      </div>
    </div>
  );
}

/** Android's Quick actions card. */
function QuickActions({ w }: { w: number }) {
  const icons: [string, React.ReactNode][] = [
    ["Search", <path key="s" d="M10.5 4a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13zM15.5 15.5L20 20" />],
    ["Up next", <path key="u" d="M8 5.5v13l10.5-6.5z" />],
    ["Coming soon", <path key="c" d="M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4" />],
    ["Movies", <path key="m" d="M4.5 5.5h15v13h-15zM8.5 5.5v13M15.5 5.5v13M4.5 9.5h4M4.5 14.5h4M15.5 9.5h4M15.5 14.5h4" />],
  ];
  return (
    <Card w={w} h={84}>
      <div className="grid grid-cols-4 h-full items-center" style={{ padding: `0 ${u(6)}` }}>
        {icons.map(([label, d]) => (
          <div key={label} className="flex flex-col items-center">
            <svg viewBox="0 0 24 24" style={{ width: u(22), height: u(22) }} fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {d}
            </svg>
            <span className="font-medium" style={{ fontSize: u(11), marginTop: u(4) }}>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** A phone screen at its own point width, with a wallpaper (or an app's
    page colour) and a status bar. */
export function Screen({ points, children, background }: { points: number; children: React.ReactNode; background?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ containerType: "inline-size" }}>
      <div
        className="absolute inset-0"
        style={{
          ["--u" as string]: `calc(100cqw / ${points})`,
          background: background ?? "radial-gradient(120% 60% at 20% 0%, #1d3b55 0%, transparent 60%), radial-gradient(90% 60% at 100% 100%, #3a1f45 0%, transparent 60%), #0d1117",
          fontFamily: "var(--font-body)",
        }}
      >
        <div className="flex justify-between items-center font-semibold text-white" style={{ height: u(54), padding: `0 ${u(34)}`, fontSize: u(16) }}>
          <span>9:41</span>
          <span style={{ letterSpacing: u(2) }}>•••</span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** The dock along the foot of the screen: plain tiles, Kodigo's among them. */
function Dock({ glass }: { glass: boolean }) {
  return (
    <div
      className="absolute flex justify-around items-center"
      style={{ left: u(14), right: u(14), bottom: u(16), height: u(92), borderRadius: u(34), background: glass ? "rgba(255,255,255,.12)" : "transparent", backdropFilter: glass ? "blur(12px)" : undefined }}
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ width: u(62), height: u(62), borderRadius: u(62 * 0.3), background: "linear-gradient(160deg,#2c3340,#1b2029)" }} />
      ))}
    </div>
  );
}

function AppIcon({ size, label }: { size: number; label: string }) {
  return (
    <div className="flex flex-col items-center" style={{ width: u(size + 16) }}>
      <div style={{ width: u(size), height: u(size), borderRadius: u(size * 0.3), background: "linear-gradient(160deg,#2c3340,#1b2029)" }} />
      <span className="text-white/85 truncate" style={{ fontSize: u(11), marginTop: u(5) }}>{label}</span>
    </div>
  );
}

function KodigoIcon({ size }: { size: number }) {
  return (
    <div className="flex flex-col items-center" style={{ width: u(size + 16) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/kodigo-icon.png" alt="" style={{ width: u(size), height: u(size), borderRadius: u(size * 0.3) }} />
      <span className="text-white truncate" style={{ fontSize: u(11), marginTop: u(5) }}>Kodigo</span>
    </div>
  );
}

export function IPhoneWidgets({ upNext, soonFilms, toWatch }: { upNext: WidgetTitle[]; soonFilms: WidgetTitle[]; toWatch: WidgetTitle[] }) {
  return (
    <Screen points={430}>
      <div className="flex flex-col items-center" style={{ gap: u(22), paddingTop: u(14) }}>
        <Large kind="UP NEXT" items={upNext} />
        <div className="flex" style={{ gap: u(24) }}>
          <Small kind="COMING SOON" item={soonFilms[0]} />
          <SearchCard />
        </div>
        <Medium kind="TO WATCH" items={toWatch} />
      </div>
      <Dock glass />
    </Screen>
  );
}

export function AndroidWidgets({ soonShows, upNext }: { soonShows: WidgetTitle[]; upNext: WidgetTitle[] }) {
  return (
    <Screen points={412}>
      <div className="flex flex-col items-center" style={{ gap: u(16), paddingTop: u(14) }}>
        <QuickActions w={380} />
        <Medium kind="COMING SOON" items={soonShows} w={380} h={176} countdown />
        <Large kind="UP NEXT" items={upNext} w={380} h={372} />
        <div className="flex justify-between" style={{ width: u(380), padding: `0 ${u(4)}` }}>
          <KodigoIcon size={60} />
          <div className="flex flex-col items-center" style={{ width: u(76) }}>
            <AndroidSearchTile size={60} />
          </div>
          <AppIcon size={60} label="Photos" />
          <AppIcon size={60} label="Music" />
        </div>
      </div>
      <Dock glass={false} />
    </Screen>
  );
}
