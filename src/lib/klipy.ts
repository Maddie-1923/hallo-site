import "server-only";

// GIFs from KLIPY (docs/gif-plan.md), for replies under reviews and comments
// on lists. The key stays here on the server: the website's picker and the
// apps' (through /api/app/gifs) both search through this file, so it can be
// changed or revoked without a release, and KLIPY is sent nothing that says
// who is searching (no customer_id).
//
// Routing searches through our server is pending KLIPY's written approval
// (their integration requirements; asked 12 Oct 2026). Until GIFS=on, nothing
// here answers, so members see no GIF button anywhere.
//
// Their rules this keeps to: results are shown in the order KLIPY returns
// them, unfiltered here (filtering is set in their Partner Panel, High: G,
// and content_filter=high on every call); media URLs are passed on exactly as
// given and always loaded from KLIPY, never copied.

const KEY = process.env.KLIPY_API_KEY ?? "";
const BASE = "https://api.klipy.com/api/v1";

/** Whether GIFs are switched on: the key is set and GIFS=on. */
export const gifsOpen = process.env.GIFS === "on" && KEY.length > 0;

/** One GIF as a reply keeps it and a picker draws it. */
export interface Gif {
  slug: string;
  title: string;
  /** The small animated WebP, which is what a thread and a picker show. */
  url: string;
  /** Its first frame as a JPEG, for Reduce Motion and paused GIFs. */
  still: string | null;
  width: number;
  height: number;
}

type Rendition = { url?: string; width?: number; height?: number };
type Item = { slug?: string; title?: string; type?: string; file?: Record<string, Record<string, Rendition>> };

/** KLIPY's item as ours: the small size, WebP to move and JPEG to hold still. */
function toGif(item: Item): Gif | null {
  const sm = item.file?.sm;
  const moving = sm?.webp ?? sm?.gif;
  if (!item.slug || !moving?.url || !/^https:\/\/static\d*\.klipy\.com\//.test(moving.url)) return null;
  return {
    slug: item.slug,
    title: (item.title ?? "").slice(0, 200),
    url: moving.url,
    still: sm?.jpg?.url ?? null,
    width: moving.width ?? 220,
    height: moving.height ?? 220,
  };
}

async function get(path: string): Promise<Item[]> {
  if (!gifsOpen) return [];
  try {
    const r = await fetch(`${BASE}/${encodeURIComponent(KEY)}${path}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const body = (await r.json()) as { result?: boolean; data?: { data?: Item[] } };
    // Ads come back in the same list when they're on; they're off for
    // Kodigo, and anything that isn't a GIF is left out all the same.
    return body.result ? (body.data?.data ?? []).filter((x) => !x.type || x.type === "gif") : [];
  } catch {
    return [];
  }
}

/** A page of search results, or of trending when the words are empty. */
export async function findGifs(query: string, page = 1): Promise<Gif[]> {
  const q = query.trim().slice(0, 100);
  const common = `per_page=24&page=${Math.max(1, Math.min(page, 20))}&content_filter=high&format_filter=webp,gif,jpg`;
  const items = await get(q ? `/gifs/search?q=${encodeURIComponent(q)}&${common}` : `/gifs/trending?${common}`);
  return items.map(toGif).filter((g): g is Gif => !!g);
}

/** One GIF by its slug, as KLIPY has it now: how a reply's GIF is checked
    before it's saved, so a client can't attach an address of its own. */
export async function gifBySlug(slug: string): Promise<Gif | null> {
  if (!/^[a-z0-9-]{1,120}$/i.test(slug)) return null;
  const [item] = await get(`/gifs/items?slugs=${encodeURIComponent(slug)}`);
  return item ? toGif(item) : null;
}
