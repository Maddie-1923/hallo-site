import "server-only";
import { readFile } from "node:fs/promises";
import { readPicture } from "@/lib/picture-store";
import { join } from "node:path";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { ProfileTitle, PublicProfileView } from "@/lib/public-profile";
import { DEFAULT_THEME, THEMES } from "@/lib/theme";

// A profile drawn as a picture to share, in two shapes: the wide link
// preview (app/u/[username]/opengraph-image.tsx) and the tall story for
// Instagram and TikTok (app/u/[username]/story/route.tsx). Both carry the
// same five boxes as the page: the photo, the about card, the four counts,
// the three number tiles and the Top 5 films and shows.
//
// Drawn in the night colours whatever the viewer's setting, and in the
// default theme's night accent: the theme is kept in each browser, so the
// server can't know the member's.
//
// Every picture is fetched here first and handed to the renderer as a data
// address, so one that's missing or slow is simply left out rather than
// failing the whole image.

const PAGE = "#17191c";
const CARD = "#2a2d32";
const CARD_HI = "#353a41";
const HAIR = "#464b53";
const INK = "#eeeff2";
const DIM = "#8c9097";
const ACCENT = (THEMES.find((t) => t.id === DEFAULT_THEME) ?? THEMES[0]).night;

const dir = join(process.cwd(), "src/fonts/og");
const fontFiles = Promise.all([readFile(join(dir, "BebasNeue-Regular.ttf")), readFile(join(dir, "OpenRunde-Regular.otf")), readFile(join(dir, "OpenRunde-Semibold.otf"))]);

export async function shareFonts() {
  const [bebas, runde, semi] = await fontFiles;
  return [
    { name: "Bebas", data: bebas, weight: 400 as const, style: "normal" as const },
    { name: "Runde", data: runde, weight: 400 as const, style: "normal" as const },
    { name: "Runde", data: semi, weight: 600 as const, style: "normal" as const },
  ];
}

/** The site's own address for a request, for the pictures it serves itself. */
export function originFrom(h: Headers, fallback?: string) {
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return fallback ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://kodigo.pro";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

/** A picture as a data address, or null when it can't be had in time. */
async function picture(url: string | null | undefined, origin: string): Promise<string | null> {
  if (!url) return null;
  // A member's own photo or banner is read from their library rather than
  // fetched from this site, whose own address a protected preview turns away.
  const own = url.match(/^\/api\/pictures\/([^/?]+)\/(avatar|banner)(?:\?|$)/);
  if (own) {
    const pic = await readPicture(decodeURIComponent(own[1]), own[2] as "avatar" | "banner").catch(() => null);
    return pic ? `data:image/jpeg;base64,${pic.bytes.toString("base64")}` : null;
  }
  try {
    const abs = new URL(url, origin).href;
    const res = await fetch(abs, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!/^image\/(jpeg|png)$/.test(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The quote's size: the whole of it always fits (it's at most 210
    characters), smaller as it gets longer. */
function fit(text: string, ...steps: [...[number, number][], number]): number {
  const last = steps[steps.length - 1] as number;
  for (const step of steps.slice(0, -1) as [number, number][]) if (text.length <= step[0]) return step[1];
  return last;
}

/** A TMDB poster at a smaller size than the page asks for. */
const smaller = (url: string | null, size: string) => url?.replace(/\/t\/p\/w\d+\//, `/t/p/${size}/`) ?? null;

interface Poster {
  key: string;
  title: string;
  src: string | null;
}

export interface ShareData {
  username: string;
  name: string;
  /** Whether they set a name; without one the card leads with the @handle, as the profile does. */
  named: boolean;
  location: string | null;
  quote: string | null;
  photo: string | null;
  banner: string | null;
  isPrivate: boolean;
  counts: [number, string][];
  tiles: { label: string; big: number; all: number | null }[];
  films: Poster[];
  shows: Poster[];
}

/** Everything the two pictures draw, with their pictures fetched. */
export async function shareData(v: PublicProfileView, origin: string, shape: "wide" | "story"): Promise<ShareData> {
  const priv = !!v.isPrivate;
  const posterSize = shape === "story" ? "w342" : "w185";
  const top = (list: ProfileTitle[]) => (priv ? [] : list.slice(0, 5));
  const films = top(v.topFilms);
  const shows = top(v.topShows);
  // As the page: their banner, else a favourite's or a recent still.
  const bannerArt = shape === "story" ? (v.banner ?? (priv ? null : [...v.favorites, ...v.topFilms, ...v.topShows, ...v.diary].find((t) => t.backdrop)?.backdrop ?? null)) : null;
  const [photo, banner, ...posters] = await Promise.all([picture(v.avatar, origin), picture(bannerArt, origin), ...[...films, ...shows].map((t) => picture(smaller(t.poster, posterSize), origin))]);
  const asPoster = (t: ProfileTitle, i: number): Poster => ({ key: t.key, title: t.title, src: posters[i] });
  const lists = v.categories.filter((c) => c.id.startsWith("list:")).length;
  const s = v.stats;
  return {
    username: v.username,
    name: v.displayName,
    named: !!v.displayName && v.displayName !== v.username,
    location: v.location?.trim() || null,
    // Marks the card adds itself, so any typed round the quote go.
    quote: v.bio?.replace(/\s*\n\s*/g, " ").trim().replace(/^["“”'‘’]+|["“”'‘’]+$/g, "").trim() || null,
    photo,
    banner,
    isPrivate: priv,
    counts: [
      [v.followers, v.followers === 1 ? "follower" : "followers"],
      [v.following, "following"],
      [lists, lists === 1 ? "list" : "lists"],
      [v.reviews.length, v.reviews.length === 1 ? "review" : "reviews"],
    ],
    tiles: [
      { label: "Movies", big: s.year?.films ?? s.films, all: s.year ? s.films : null },
      { label: "Shows", big: s.year?.shows ?? s.shows, all: s.year ? s.shows : null },
      { label: "Episodes", big: s.year?.episodes ?? s.episodes, all: s.year ? s.episodes : null },
    ],
    films: films.map((t, i) => asPoster(t, i)),
    shows: shows.map((t, i) => asPoster(t, i + films.length)),
  };
}

const n = (x: number) => x.toLocaleString("en");

// The pieces both shapes share, sized by a scale (1 for the wide picture).

function Photo({ d, size, ring }: { d: ShareData; size: number; ring: number }) {
  return (
    <div style={{ display: "flex", width: size, height: size, borderRadius: size, border: `${ring}px solid ${PAGE}`, background: ACCENT, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {d.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.photo} alt="" width={size - ring * 2} height={size - ring * 2} style={{ objectFit: "cover", width: size - ring * 2, height: size - ring * 2 }} />
      ) : (
        <span style={{ fontFamily: "Bebas", fontSize: size * 0.52, color: PAGE, lineHeight: 1, paddingTop: size * 0.06 }}>{d.name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

function Box({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: "flex", background: CARD, border: `2px solid ${HAIR}`, borderRadius: 28, ...style }}>{children}</div>;
}

function Label({ children, size }: { children: ReactNode; size: number }) {
  return <div style={{ display: "flex", fontSize: size, fontWeight: 600, letterSpacing: size * 0.14, textTransform: "uppercase", color: DIM }}>{children}</div>;
}

function Tiles({ d, k }: { d: ShareData; k: number }) {
  return (
    <div style={{ display: "flex", width: "100%", gap: 10 * k, flexShrink: 0 }}>
      {d.tiles.map((t) => (
        <div key={t.label} style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", background: CARD_HI, border: `2px solid ${HAIR}`, borderRadius: 20 * k, padding: `${14 * k}px ${6 * k}px` }}>
          <span style={{ fontFamily: "Bebas", fontSize: 58 * k, lineHeight: 1, color: ACCENT, paddingTop: 4 * k }}>{n(t.big)}</span>
          <span style={{ marginTop: 6 * k, fontSize: 17 * k, fontWeight: 600, letterSpacing: 1.5 * k, textTransform: "uppercase", color: INK }}>{t.label}</span>
          {t.all !== null && <span style={{ marginTop: 6 * k, fontSize: 16 * k, color: DIM }}>{n(t.all)} all time</span>}
        </div>
      ))}
    </div>
  );
}

function Row({ title, items, w, gap, label }: { title: string; items: Poster[]; w: number; gap: number; label: number }) {
  const h = Math.round(w * 1.5);
  // Always five slots wide, so the two rows line up however many each has.
  return (
    <div style={{ display: "flex", flexDirection: "column", width: w * 5 + gap * 4, flexShrink: 0 }}>
      <Label size={label}>{title}</Label>
      <div style={{ display: "flex", marginTop: label * 0.6, gap }}>
        {items.map((p) => (
          <div key={p.key} style={{ display: "flex", width: w, height: h, borderRadius: w * 0.09, overflow: "hidden", background: CARD_HI, border: `1px solid ${HAIR}`, alignItems: "center", justifyContent: "center", padding: p.src ? 0 : 8 }}>
            {p.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.src} alt="" width={w} height={h} style={{ objectFit: "cover", width: w, height: h }} />
            ) : (
              <span style={{ fontSize: label * 0.9, color: DIM, textAlign: "center" }}>{p.title}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The Kodigo mark (components/Logo.tsx), in the night ink. */
function Mark({ h }: { h: number }) {
  return (
    <svg width={(h * 532) / 916} height={h} viewBox="240 56 532 916">
      <rect x="338" y="65" width="137" height="560" rx="68.5" fill="#38B6FF" />
      <rect x="295" y="65" width="137" height="560" rx="68.5" fill="#FF69C4" />
      <rect x="248" y="65" width="137" height="560" rx="68.5" fill="#FFCB14" />
      <g stroke={INK} strokeWidth="226" strokeLinecap="round" fill="none">
        <path d="M361 568V852" />
        <path d="M640 568L361 847" />
        <path d="M648 852L361 565" />
      </g>
    </svg>
  );
}

function Footer({ d, k }: { d: ShareData; k: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <span style={{ fontSize: 22 * k, color: DIM }}>
        kodigo.pro/u/<span style={{ color: INK, fontWeight: 600 }}>{d.username}</span>
      </span>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Mark h={38 * k} />
        <span style={{ fontFamily: "Bebas", fontSize: 40 * k, lineHeight: 1, color: INK, marginLeft: 10 * k, paddingTop: 4 * k, letterSpacing: 1 }}>Kodigo</span>
      </div>
    </div>
  );
}

function PrivatePill({ k }: { k: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: `${8 * k}px ${22 * k}px`, borderRadius: 999, border: `2px solid ${HAIR}`, background: CARD_HI, fontSize: 22 * k, fontWeight: 600, letterSpacing: 2 * k, textTransform: "uppercase", color: DIM }}>
      <svg width={22 * k} height={22 * k} viewBox="0 0 24 24" fill="none" stroke={DIM} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10 * k }}>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      Private profile
    </div>
  );
}

/** The wide link preview, 1200 × 630: photo and counts on the left, the
    about card and the numbers in the middle, Favourites on the right. */
export function WideCard({ d }: { d: ShareData }): ReactElement {
  if (d.isPrivate) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAGE, padding: 36, fontFamily: "Runde", color: INK }}>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Photo d={d} size={260} ring={0} />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 48, maxWidth: 620 }}>
            {d.named ? (
              <>
                <span style={{ fontFamily: "Bebas", fontSize: 96, lineHeight: 1, paddingTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
                <span style={{ fontSize: 30, color: DIM, marginTop: 6, marginBottom: 26 }}>@{d.username}</span>
              </>
            ) : (
              <span style={{ fontSize: 60, fontWeight: 600, lineHeight: 1.1, marginBottom: 26, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{d.username}</span>
            )}
            <div style={{ display: "flex" }}>
              <PrivatePill k={1} />
            </div>
          </div>
        </div>
        <Footer d={d} k={1} />
      </div>
    );
  }
  const hasFavs = d.films.length + d.shows.length > 0;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAGE, padding: "28px 30px 24px", fontFamily: "Runde", color: INK }}>
      <div style={{ display: "flex", flex: 1, gap: 16, minHeight: 0 }}>
        {/* Photo and the four counts. */}
        <div style={{ display: "flex", flexDirection: "column", width: 244, gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Photo d={d} size={244} ring={0} />
          </div>
          <Box style={{ flex: 1, flexWrap: "wrap", padding: "12px 18px", alignContent: "center" }}>
            {d.counts.map(([x, label]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", width: "50%", padding: "6px 0" }}>
                <span style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1 }}>{n(x)}</span>
                <span style={{ fontSize: 19, color: DIM }}>{label}</span>
              </div>
            ))}
          </Box>
        </div>

        {/* About and the numbers. */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16, minWidth: 0 }}>
          <Box style={{ flex: 1, flexDirection: "column", padding: "22px 26px", minHeight: 0 }}>
            {d.named ? (
              <>
                <span style={{ fontFamily: "Bebas", fontSize: 68, lineHeight: 1, paddingTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
                <span style={{ fontSize: 22, color: DIM, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{d.username}</span>
              </>
            ) : (
              <span style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{d.username}</span>
            )}
            {d.location && <span style={{ fontSize: 22, color: DIM, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.location}</span>}
            {d.quote && <div style={{ display: "block", marginTop: 14, fontSize: fit(d.quote, [80, 22], [140, 19], 16), lineHeight: 1.35, color: INK }}>{`“${d.quote}”`}</div>}
          </Box>
          <Tiles d={d} k={1} />
        </div>

        {/* Favourites. */}
        {hasFavs && (
          <Box style={{ flexDirection: "column", justifyContent: "center", alignItems: "center", width: 476, padding: "18px 20px", gap: 22 }}>
            {d.films.length > 0 && <Row title="Top 5 films" items={d.films} w={78} gap={10} label={16} />}
            {d.shows.length > 0 && <Row title="Top 5 shows" items={d.shows} w={78} gap={10} label={16} />}
          </Box>
        )}
      </div>
      <div style={{ display: "flex", marginTop: 16 }}>
        <Footer d={d} k={1} />
      </div>
    </div>
  );
}

/** The story, 1080 × 1920: the banner across the top with the photo over
    its edge, then the about card, the counts, the numbers and Favourites. */
export function StoryCard({ d }: { d: ShareData }): ReactElement {
  const BANNER = 470;
  const PHOTO = 240;
  const hasFavs = d.films.length + d.shows.length > 0;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAGE, fontFamily: "Runde", color: INK, position: "relative" }}>
      <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: 1080, height: BANNER, background: `linear-gradient(135deg, ${ACCENT}, #1a1a19)` }}>
        {d.banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.banner} alt="" width={1080} height={BANNER} style={{ objectFit: "cover", width: 1080, height: BANNER }} />
        )}
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: 1080, height: BANNER, background: `linear-gradient(to bottom, rgba(23,25,28,0) 55%, ${PAGE} 100%)` }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, padding: `${BANNER - PHOTO / 2}px 48px 40px` }}>
        <Photo d={d} size={PHOTO} ring={10} />
        {d.named ? (
          <span style={{ fontFamily: "Bebas", fontSize: 100, lineHeight: 1, marginTop: 12, flexShrink: 0, paddingTop: 8, maxWidth: 980, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
        ) : (
          <span style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.15, marginTop: 16, flexShrink: 0, maxWidth: 980, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{d.username}</span>
        )}
        {(d.named || (!d.isPrivate && d.location)) && (
          <span style={{ fontSize: 34, color: DIM, marginTop: 2, flexShrink: 0, maxWidth: 980, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {[d.named ? `@${d.username}` : null, !d.isPrivate && d.location ? d.location : null].filter(Boolean).join("  ·  ")}
          </span>
        )}

        {d.isPrivate ? (
          <div style={{ display: "flex", flex: 1, alignItems: "flex-start", marginTop: 40 }}>
            <PrivatePill k={1.5} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, width: "100%", gap: 20, marginTop: 20, minHeight: 0 }}>
            {d.quote && (
              <div style={{ display: "flex", justifyContent: "center", flexShrink: 0, padding: "0 24px" }}>
                <div style={{ display: "block", fontSize: fit(d.quote, [90, 34], [150, 30], 26), lineHeight: 1.35, textAlign: "center" }}>{`“${d.quote}”`}</div>
              </div>
            )}
            <Box style={{ flexShrink: 0, justifyContent: "space-around", padding: "16px 12px" }}>
              {d.counts.map(([x, label]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: 46, fontWeight: 600, lineHeight: 1.1 }}>{n(x)}</span>
                  <span style={{ fontSize: 24, color: DIM }}>{label}</span>
                </div>
              ))}
            </Box>
            <Tiles d={d} k={1.25} />
            {hasFavs && (
              <Box style={{ flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "18px 26px", gap: 20 }}>
                {d.films.length > 0 && <Row title="Top 5 films" items={d.films} w={150} gap={18} label={21} />}
                {d.shows.length > 0 && <Row title="Top 5 shows" items={d.shows} w={150} gap={18} label={21} />}
              </Box>
            )}
          </div>
        )}
        <div style={{ display: "flex", width: "100%", marginTop: 26, flexShrink: 0 }}>
          <Footer d={d} k={1.35} />
        </div>
      </div>
    </div>
  );
}

/** For a profile that isn't there (or isn't any more): Kodigo's own card. */
export function GenericCard(): ReactElement {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: PAGE, fontFamily: "Runde", color: INK }}>
      <Mark h={200} />
      <span style={{ fontFamily: "Bebas", fontSize: 120, lineHeight: 1, marginTop: 30, paddingTop: 10 }}>Kodigo</span>
      <span style={{ fontSize: 30, color: DIM, marginTop: 8 }}>Track your shows and movies</span>
    </div>
  );
}

/** How long a picture may be kept: shared caches only for what anybody
    would see, so an owner's or a follower's view stays in their browser. */
export function cacheFor(v: PublicProfileView | null) {
  const anyone = !v || !v.viewerFollow || v.viewerFollow === "none" || v.viewerFollow === "pending";
  return anyone ? "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" : "private, max-age=3600";
}
