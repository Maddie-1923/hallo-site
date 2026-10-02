// The links on a profile card (2 Oct 2026): up to three of the person's own
// addresses, under the location and quote. Shared by the page that draws
// them and the action that saves them. Web addresses only; each is drawn as
// a plain outbound link with a small mark for the services people use most.

export const MAX_LINKS = 3;

export type LinkKind = "youtube" | "x" | "instagram" | "tiktok" | "letterboxd" | "threads" | "bluesky" | "web";

/** What someone typed, as an address to save, or null when it isn't one.
    "youtube.com/@me" gains its https://; anything that isn't http(s) goes. */
export function cleanLink(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    const out = u.toString();
    return out.length <= 200 && !/\s/.test(out) ? out : null;
  } catch {
    return null;
  }
}

const KINDS: [LinkKind, RegExp][] = [
  ["youtube", /(^|\.)(youtube\.com|youtu\.be)$/],
  ["x", /(^|\.)(x\.com|twitter\.com)$/],
  ["instagram", /(^|\.)instagram\.com$/],
  ["tiktok", /(^|\.)tiktok\.com$/],
  ["letterboxd", /(^|\.)(letterboxd\.com|boxd\.it)$/],
  ["threads", /(^|\.)threads\.(net|com)$/],
  ["bluesky", /(^|\.)bsky\.app$/],
];

/** Which service an address belongs to, and the short name to show for it:
    the handle where the address has one (@name), else the site and path. */
export function describeLink(href: string): { kind: LinkKind; label: string } {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return { kind: "web", label: href };
  }
  const host = u.hostname.replace(/^www\./, "");
  const kind = KINDS.find(([, re]) => re.test(host))?.[0] ?? "web";
  const first = u.pathname.split("/").filter(Boolean)[0] ?? "";
  if (kind !== "web" && first) {
    const handle = first.replace(/^@/, "");
    return { kind, label: kind === "youtube" && !first.startsWith("@") ? `${host}/${first}` : `@${handle}` };
  }
  const path = u.pathname.replace(/\/$/, "");
  return { kind, label: `${host}${path}`.slice(0, 40) };
}
