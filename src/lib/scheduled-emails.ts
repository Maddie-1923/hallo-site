import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isArchive, type LibraryArchive } from "./archive";
import type { AlertsData, DigestData, FriendItem, Row, Wide } from "./digest-email";
import type { Settings } from "./settings-shape";
import { episodeLength, filmLength, image, releasesOn, showDetail } from "./tmdb";
import { trackerFromArchive, type CalendarEvent } from "./tracker";

// What goes in someone's weekly digest and day's reminders
// (app/api/scheduled-emails), from their library, TMDB and the people they
// follow; the emails themselves are lib/digest-email.ts. Everything is read
// with the service role, so blocks are checked here by hand.

// ---- Dates, as plain "YYYY-MM-DD" days ----

const dayMs = 86_400_000;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * dayMs).toISOString().slice(0, 10);
const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(new Date(`${d}T12:00:00Z`));
const weekdayOf = (d: string) => fmt(d, { weekday: "short" });
const joinAnd = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** The episodes of one show, as a line: "S2 E7 and E8", "Season 5, all 10 episodes". */
function episodesLine(events: CalendarEvent[], seasonSize: (s: number) => number) {
  const eps = events.map((e) => e.episode!.split("-").map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const seasons = [...new Set(eps.map(([s]) => s))];
  if (seasons.length === 1) {
    const s = seasons[0];
    const all = seasonSize(s);
    if (eps.length > 3 && eps.length === all) return `Season ${s}, all ${all} episodes`;
    return `S${s} ${joinAnd(eps.map(([, e]) => `E${e}`))}`;
  }
  return joinAnd(eps.map(([s, e]) => `S${s} E${e}`));
}

async function libraryOf(db: SupabaseClient, uid: string): Promise<LibraryArchive | null> {
  const { data } = await db.from("libraries").select("archive").eq("user_id", uid).maybeSingle();
  return data && isArchive(data.archive) ? data.archive : null;
}

/** The day's reminders, as their switches ask. */
export async function gatherAlerts(db: SupabaseClient, uid: string, s: Partial<Settings>, today: string, region: string): Promise<Omit<AlertsData, "me" | "site" | "unsubscribe">> {
  const a = await libraryOf(db, uid);
  const empty = { day: fmt(today, { weekday: "long", day: "numeric", month: "long" }), episodes: [] as Row[], premieres: [] as Row[], films: [] as Row[], releases: [] as Row[] };
  const known = new Set<string>();
  if (a) {
    const t = await trackerFromArchive(a, new Date(`${today}T12:00:00Z`));
    const todays = t.calendar.filter((e) => e.date === today);
    const byShow = new Map<string, CalendarEvent[]>();
    for (const e of todays) if (e.episode) byShow.set(e.t.key, [...(byShow.get(e.t.key) ?? []), e]);
    for (const events of byShow.values()) {
      const t0 = events[0].t;
      const premiere = events.some((e) => e.episode!.endsWith("-1"));
      const row: Row = { title: t0.title, href: t0.href, poster: t0.poster, what: episodesLine(events, () => 0), note: premiere ? "New season" : null };
      if (premiere && s.alertSeasons) empty.premieres.push(row);
      else if (s.alertEpisodes) empty.episodes.push(row);
      known.add(t0.key);
    }
    // A new season of a show they'd finished: the calendar only follows
    // shows being watched.
    if (s.alertSeasons) {
      const others = a.shows.filter((x) => x.status === "Finished" && !known.has(`s${x.show.id}`)).slice(0, 60);
      const details = await Promise.all(others.map((x) => showDetail(x.show.id).catch(() => null)));
      details.forEach((d, i) => {
        const ep = d?.nextEpisode;
        if (!ep || ep.air_date !== today || ep.episode_number !== 1) return;
        const show = others[i].show;
        empty.premieres.push({ title: show.name, href: `/show/${show.id}`, poster: image.poster(show.poster_path, "w185"), what: `Season ${ep.season_number} starts today`, note: "You finished the last one" });
        known.add(`s${show.id}`);
      });
    }
    if (s.alertFilms) {
      for (const e of todays.filter((x) => !x.episode)) {
        empty.films.push({ title: e.t.title, href: e.t.href, poster: e.t.poster, what: "Out today", note: "On your watchlist" });
        known.add(e.t.key);
      }
    }
  }
  if (s.alertReleases) {
    for (const r of await releasesOn(today, region).catch(() => [])) {
      if (known.has(r.key)) continue;
      empty.releases.push({ title: r.title, href: r.href, poster: r.poster, what: r.kind === "movie" ? "Film, out today" : "Series, starts today" });
      if (empty.releases.length >= 4) break;
    }
  }
  return empty;
}

/** The week just gone, next week, and what the people they follow did. */
export async function gatherDigest(db: SupabaseClient, uid: string, today: string): Promise<Omit<DigestData, "me" | "site" | "unsubscribe">> {
  const start = addDays(today, -7);
  const end = addDays(today, -1);
  const week = `${fmt(start, { day: "numeric" })}–${fmt(end, { day: "numeric", month: "short" })}`;
  const inWeek = (d: string | undefined | null) => !!d && d.slice(0, 10) >= start && d.slice(0, 10) <= end;
  const a = await libraryOf(db, uid);

  let stats: DigestData["stats"] = null;
  const out: Row[] = [];
  const coming: Wide[] = [];
  if (a) {
    // Your week: what was checked off in it, and how long that took.
    const perShow = new Map<number, number>();
    for (const [k, d] of Object.entries(a.watchedDates ?? {})) if (inWeek(d)) perShow.set(Number(k.split("-")[0]), (perShow.get(Number(k.split("-")[0])) ?? 0) + 1);
    const films = Object.entries(a.movieWatchedDates ?? {}).filter(([, d]) => inWeek(d)).map(([id]) => Number(id));
    const lengths = await Promise.all([...perShow.keys()].map(async (id) => (perShow.get(id) ?? 0) * (await episodeLength(id).catch(() => 42))));
    const filmMinutes = await Promise.all(films.map(async (id) => a.movies.find((t) => t.movie.id === id)?.movie.runtime ?? (await filmLength(id).catch(() => null)) ?? 110));
    const episodes = [...perShow.values()].reduce((n, x) => n + x, 0);
    const finished = a.shows.filter((t) => t.status === "Finished" && perShow.has(t.show.id)).map((t) => t.show.name);
    stats = {
      episodes,
      films: films.length,
      minutes: lengths.reduce((n, x) => n + x, 0) + filmMinutes.reduce((n, x) => n + x, 0),
      highlight: finished.length ? `You finished ${joinAnd(finished.slice(0, 2))}${finished.length > 2 ? ` and ${finished.length - 2} more` : ""}.` : null,
    };

    // Out this week from their shows, and how far behind they are.
    const t = await trackerFromArchive(a, new Date(`${today}T12:00:00Z`));
    const seen = new Set(a.watched);
    const byShow = new Map<string, CalendarEvent[]>();
    for (const e of t.calendar) if (e.episode && inWeek(e.date)) byShow.set(e.t.key, [...(byShow.get(e.t.key) ?? []), e]);
    for (const [key, events] of byShow) {
      const id = Number(key.slice(1));
      const aired = t.calendar.filter((e) => e.t.key === key && e.episode && e.date <= end);
      const behind = aired.filter((e) => !seen.has(`${id}-${e.episode}`)).length;
      const seasonSize = (s: number) => t.calendar.filter((e) => e.t.key === key && e.episode?.startsWith(`${s}-`)).length;
      const days = [...new Set(events.map((e) => weekdayOf(e.date)))];
      out.push({
        title: events[0].t.title,
        href: events[0].t.href,
        poster: events[0].t.poster,
        what: `${episodesLine(events, seasonSize)} · ${joinAnd(days)}`,
        note: events.some((e) => e.episode!.endsWith("-1")) ? "New season" : behind ? `You're ${behind} behind` : "Up to date",
      });
    }

    // Coming next week: each show's next episode and watchlist films, premieres first.
    const next = t.calendar.filter((e) => e.date >= today && e.date <= addDays(today, 6));
    const firstPer = new Map<string, CalendarEvent>();
    for (const e of next) if (!firstPer.has(e.t.key)) firstPer.set(e.t.key, e);
    const ordered = [...firstPer.values()].sort((x, y) => Number(!!y.episode?.endsWith("-1")) - Number(!!x.episode?.endsWith("-1")) || x.date.localeCompare(y.date));
    for (const e of ordered) {
      const [s, n] = (e.episode ?? "").split("-").map(Number);
      coming.push({ title: e.t.title, href: e.t.href, image: e.t.backdrop, what: `${e.episode ? (n === 1 ? `Season ${s} starts` : `S${s} E${n}`) : "Out"} · ${fmt(e.date, { weekday: "short", day: "numeric", month: "short" })}` });
    }
  }

  return { week, stats, out, coming, friends: await friendsWeek(db, uid, start) };
}

/** What the people they follow reviewed, rated, loved and listed since `start`. */
async function friendsWeek(db: SupabaseClient, uid: string, start: string): Promise<FriendItem[]> {
  const [{ data: f }, { data: blocks }] = await Promise.all([
    db.from("follows").select("followee").eq("follower", uid).eq("status", "accepted").limit(1000),
    db.from("blocks").select("blocker, blocked").or(`blocker.eq.${uid},blocked.eq.${uid}`),
  ]);
  const blocked = new Set((blocks ?? []).map((b) => (b.blocker === uid ? b.blocked : b.blocker)));
  const ids = (f ?? []).map((x) => x.followee).filter((id) => !blocked.has(id));
  if (!ids.length) return [];
  const since = `${start}T00:00:00Z`;
  const [entries, lists, profiles] = await Promise.all([
    db.from("public_entries").select("user_id, kind, tmdb_id, title, poster_path, rating, reaction, review, spoilers, updated_at").in("user_id", ids).neq("kind", "episode").gte("updated_at", since).order("updated_at", { ascending: false }).limit(40),
    db.from("public_lists").select("user_id, id, name, titles, updated_at").in("user_id", ids).gte("updated_at", since).order("updated_at", { ascending: false }).limit(10),
    db.from("profiles").select("user_id, username, suspended_at").in("user_id", ids),
  ]);
  const who = new Map((profiles.data ?? []).filter((p) => p.username && !p.suspended_at).map((p) => [p.user_id, p.username as string]));
  const items: (FriendItem & { at: string; rank: number })[] = [];
  for (const e of entries.data ?? []) {
    const name = who.get(e.user_id);
    if (!name || (!e.review && e.rating == null && e.reaction !== "loved")) continue;
    const kind: FriendItem["kind"] = e.review && !e.spoilers ? "review" : e.rating != null ? "rating" : "loved";
    items.push({ who: name, kind, title: e.title, href: e.review ? `/u/${name}/review/${e.kind === "movie" ? "m" : "s"}${e.tmdb_id}` : `/${e.kind}/${e.tmdb_id}`, poster: image.poster(e.poster_path, "w185"), rating: e.rating == null ? null : Number(e.rating), text: kind === "review" ? e.review : null, at: e.updated_at, rank: kind === "review" ? 0 : 1 });
  }
  for (const l of lists.data ?? []) {
    const name = who.get(l.user_id);
    const titles = (l.titles as { title: string; poster_path: string | null }[]) ?? [];
    if (!name || !titles.length) continue;
    items.push({ who: name, kind: "list", title: l.name, href: `/u/${name}/list/${l.id}`, poster: image.poster(titles[0]?.poster_path ?? null, "w185"), rating: null, text: null, detail: `${titles.length} ${titles.length === 1 ? "title" : "titles"}, starting with ${titles[0].title}`, at: l.updated_at, rank: 1 });
  }
  // Reviews first, then the rest, newest first; one line per person and title.
  const seen = new Set<string>();
  return items
    .sort((x, y) => x.rank - y.rank || y.at.localeCompare(x.at))
    .filter((i) => (seen.has(`${i.who}:${i.title}`) ? false : (seen.add(`${i.who}:${i.title}`), true)))
    .slice(0, 6)
    .map((i): FriendItem => ({ who: i.who, kind: i.kind, title: i.title, href: i.href, poster: i.poster, rating: i.rating, text: i.text, detail: i.detail }));
}
