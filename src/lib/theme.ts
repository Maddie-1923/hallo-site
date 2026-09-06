// The app's theme system, mirrored. `Theme.swift` is the source: nine light
// accents, one hex each, the same colour in both schemes. After dark a
// *filled* accent surface is scaled toward black only as far as 4.5:1 for
// graphite lettering allows (`dimmedForNight`), and by day accent *type* on
// the Bone page uses the accent at half strength (`accentDarkened`), because
// a light accent can't carry as lettering on a pale page.
//
// The night fills and day inks below are those two functions run once and
// written down, so the pre-paint script in the document head can be a lookup
// and the page never flashes the wrong colour. Re-run the arithmetic in
// Theme.swift if an accent moves.

export interface Theme {
  id: string;
  name: string;
  /** The accent, same in both schemes. */
  accent: string;
  /** The accent scaled toward black to the 4.5:1 floor — night fills. */
  nightFill: string;
  /** Each channel halved — accent as type on the Bone page. */
  dayInk: string;
}

export const THEMES: Theme[] = [
  { id: "brutalisto", name: "Brutalisto", accent: "#8C8C8C", nightFill: "#828282", dayInk: "#464646" },
  { id: "fawn", name: "Fawn", accent: "#BC9876", nightFill: "#9A7C60", dayInk: "#5E4C3B" },
  { id: "poppy", name: "Poppy", accent: "#DE525D", nightFill: "#DE525D", dayInk: "#6F292E" },
  { id: "honey", name: "Honey", accent: "#E9AF2D", nightFill: "#A47B1F", dayInk: "#745716" },
  { id: "malachite", name: "Malachite", accent: "#33BA99", nightFill: "#289278", dayInk: "#195D4C" },
  // Stored as "borealis" in the app for the reason Theme.swift gives; the
  // web has no legacy value to protect, so the id is the name.
  { id: "coldy", name: "Coldy", accent: "#88BCBE", nightFill: "#63898A", dayInk: "#445E5F" },
  { id: "lagune", name: "Lagune", accent: "#5A97D7", nightFill: "#4F85BE", dayInk: "#2D4B6B" },
  { id: "wisteria", name: "Wisteria", accent: "#A08BD7", nightFill: "#8A78B9", dayInk: "#50456B" },
  { id: "bloom", name: "Bloom", accent: "#D5708B", nightFill: "#C1657E", dayInk: "#6A3845" },
];

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
  const root = document.documentElement;
  root.dataset.scheme = dark ? "dark" : "light";
  root.dataset.theme = t.id;
  root.style.setProperty("--accent", dark ? t.accent : t.dayInk);
  root.style.setProperty("--accent-fill", dark ? t.nightFill : t.accent);
  root.style.setProperty("--accent-raw", t.accent);
}

/**
 * The same logic as a string, for a <script> in <head> that runs before the
 * first paint. Kept in step with `applyTheme` by hand — there are only a few
 * lines, and importing this module into an inline script isn't possible.
 */
export const prePaintScript = `(function(){try{
var T=${JSON.stringify(Object.fromEntries(THEMES.map((t) => [t.id, [t.accent, t.nightFill, t.dayInk]])))};
var id=localStorage.getItem(${JSON.stringify(THEME_KEY)})||${JSON.stringify(DEFAULT_THEME)};
var a=localStorage.getItem(${JSON.stringify(APPEARANCE_KEY)})||"system";
var t=T[id]||T[${JSON.stringify(DEFAULT_THEME)}];if(!T[id])id=${JSON.stringify(DEFAULT_THEME)};
var dark=a==="dark"||(a!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);
var r=document.documentElement;r.dataset.scheme=dark?"dark":"light";r.dataset.theme=id;
r.style.setProperty("--accent",dark?t[0]:t[2]);r.style.setProperty("--accent-fill",dark?t[1]:t[0]);r.style.setProperty("--accent-raw",t[0]);
}catch(e){}})();`;
