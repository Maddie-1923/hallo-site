// The app's theme system, mirrored. `Theme.swift` is the source: seven
// themes (Poppy and Bloom were retired in September 2026), each stated as two
// tones chosen by eye, a darker one for Day and a lighter one for Night. The
// app draws the accent, and fills with it, in whichever tone the scheme calls
// for. Nothing is derived from a single hex any more.
//
// Three things are worked out here from those two tones, once, at build time,
// so the pre-paint script in the document head can be a lookup and the page
// never flashes the wrong colour:
// - the lettering on a filled accent (`onColor` in the app): graphite or
//   cream, whichever reads better against the tone;
// - accent *type* on the Bone page by day: the day tone when it holds 4.5:1
//   there, and halved (`accentDarkened`) when it doesn't, which is Honey;
// - the night tone kept apart, for the billboards, which sit on a darkened
//   photograph and want the night accent whatever the page is doing.
//
// Keep the pairs in step with `AppTheme.pair` in Theme.swift.

export interface Theme {
  id: string;
  name: string;
  /** The Day tone. */
  day: string;
  /** The Night tone. */
  night: string;
}

export const THEMES: Theme[] = [
  { id: "brutalisto", name: "Brutalisto", day: "#828282", night: "#8C8C8C" },
  { id: "fawn", name: "Fawn", day: "#9A7D60", night: "#A98E72" },
  { id: "honey", name: "Honey", day: "#F4C84C", night: "#D9BC52" },
  // "malachite" and "coldy" are this site's stored ids from before the
  // renames; kept so a visitor's saved choice still finds its theme.
  { id: "malachite", name: "Jungle", day: "#365D40", night: "#609C6F" },
  { id: "coldy", name: "Coldy", day: "#63898A", night: "#88BBBE" },
  { id: "lagune", name: "Lagune", day: "#15587B", night: "#6FAECF" },
  { id: "wisteria", name: "Wisteria", day: "#6B5E87", night: "#9E7CB7" },
];

const GRAPHITE = "#1A1A19";
const CREAM = "#F4F1EA";
const BONE = "#E6E0D6";

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

function ratio(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

function halved(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const h = (((n >> 16) & 255) >> 1) * 65536 + (((n >> 8) & 255) >> 1) * 256 + ((n & 255) >> 1);
  return `#${h.toString(16).padStart(6, "0")}`;
}

/** The lettering for a surface filled with `tone`. */
function onTone(tone: string) {
  return ratio(tone, GRAPHITE) >= ratio(tone, CREAM) ? GRAPHITE : CREAM;
}

/** Per theme and scheme: [accent as type, accent fill, lettering on the fill]. */
function tokens(t: Theme, dark: boolean): [string, string, string] {
  const tone = dark ? t.night : t.day;
  const type = dark || ratio(t.day, BONE) >= 4.5 ? tone : halved(t.day);
  return [type, tone, onTone(tone)];
}

export type Appearance = "system" | "light" | "dark";
export const APPEARANCES: { id: Appearance; name: string }[] = [
  { id: "system", name: "Auto" },
  { id: "light", name: "Day" },
  { id: "dark", name: "Night" },
];

export const DEFAULT_THEME = "lagune";
export const THEME_KEY = "kodigo.theme";
export const APPEARANCE_KEY = "kodigo.appearance";

/** What the pre-paint script and the menu both do: stamp the root element. */
export function applyTheme(themeID: string, appearance: Appearance) {
  const t = THEMES.find((x) => x.id === themeID) ?? THEMES.find((x) => x.id === DEFAULT_THEME)!;
  const dark =
    appearance === "dark" || (appearance === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [type, fill, on] = tokens(t, dark);
  const root = document.documentElement;
  root.dataset.scheme = dark ? "dark" : "light";
  root.dataset.theme = t.id;
  root.style.setProperty("--accent", type);
  root.style.setProperty("--accent-fill", fill);
  root.style.setProperty("--accent-raw", fill);
  root.style.setProperty("--on-accent", on);
  root.style.setProperty("--accent-night", t.night);
}

/**
 * The same logic as a string, for a <script> in <head> that runs before the
 * first paint. The per-theme values are worked out above and embedded, so the
 * script is only a lookup.
 */
const TABLE = Object.fromEntries(THEMES.map((t) => [t.id, { d: tokens(t, false), n: tokens(t, true), night: t.night }]));

export const prePaintScript = `(function(){try{
var T=${JSON.stringify(TABLE)};
var id=localStorage.getItem(${JSON.stringify(THEME_KEY)})||${JSON.stringify(DEFAULT_THEME)};
if(!T[id])id=${JSON.stringify(DEFAULT_THEME)};var t=T[id];
var a=localStorage.getItem(${JSON.stringify(APPEARANCE_KEY)})||"system";
var dark=a==="dark"||(a!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);
var v=dark?t.n:t.d;var r=document.documentElement;r.dataset.scheme=dark?"dark":"light";r.dataset.theme=id;
var p=function(k,x){r.style.setProperty(k,x)};p("--accent",v[0]);p("--accent-fill",v[1]);p("--accent-raw",v[1]);p("--on-accent",v[2]);p("--accent-night",t.night);
}catch(e){}})();`;

/**
 * The Night neutrals as inline CSS variables, for a block that always sits on
 * a darkened photograph (the billboards) and so has to draw light type and a
 * light logo even when the page around it is in Day.
 */
export const nightTokens = {
  "--ink": "#e6e0d6",
  "--bone": "#e6e0d6",
  "--dim": "#c9c4bb",
  "--hair": "#42423f",
  "--card": "#30302e",
  "--card-hi": "#383836",
  "--page": "#1a1a19",
  // Accent *type* on the photograph takes the night tone; the fill and its
  // lettering are left as the page has them, so a filled control inside the
  // billboard is the same colour as the pill in the nav.
  "--accent": "var(--accent-night)",
} as Record<string, string>;
