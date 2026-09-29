import "server-only";
import { readFile } from "node:fs/promises";
import { isArchive } from "@/lib/archive";
import { profileFromArchive, withAiredEpisodes, withUpToDate, type CategoryEntry, type DiaryEntry, type ProfileTitle, type PublicProfileView, type ReviewEntry } from "@/lib/public-profile";
import { image, movieRails, showRails } from "@/lib/tmdb";
import { member, type Member } from "@/lib/members";

// The two development-only profiles, /u/preview and /u/sample (see
// app/u/[username]/page.tsx), and the made-up reviews and watches they carry
// for testing. All of this goes before the site opens (docs/social-plan.md,
// "Before opening").
const DEV = process.env.NODE_ENV === "development";

/** The profile for a username, or null. Only the two previews exist until
    the public tables do. */
export async function loadProfile(username: string): Promise<PublicProfileView | null> {
  if (DEV && username === "preview") return previewFromFile();
  if (DEV && username === "sample") return sampleProfile();
  const m = DEV ? member(username) : null;
  if (m) return sampleProfile(m);
  return null;
}

/** The preview's library itself, for pages drawn from it (the tracker). */
export async function previewArchive() {
  const path = process.env.PROFILE_PREVIEW_FILE;
  if (!DEV || !path) return null;
  try {
    const raw = JSON.parse(await readFile(path, "utf8"));
    return isArchive(raw) ? raw : null;
  } catch {
    return null;
  }
}

async function previewFromFile(): Promise<PublicProfileView | null> {
  const path = process.env.PROFILE_PREVIEW_FILE;
  if (!path) return null;
  try {
    const raw = JSON.parse(await readFile(path, "utf8"));
    if (!isArchive(raw)) return null;
    // The app keeps its own profile pictures as base64 JPEGs in the archive.
    const pic = (v: unknown) => (typeof v === "string" && v.length > 100 ? `data:image/jpeg;base64,${v}` : null);
    const view = profileFromArchive(raw, {
      username: "preview",
      displayName: process.env.PROFILE_PREVIEW_NAME ?? "Your name",
      avatar: pic((raw as Record<string, unknown>).profileAvatar),
      banner: pic((raw as Record<string, unknown>).profileBanner),
      bio: null,
      location: null,
    }, true);
    return withSampleLists(await withSampleWatchlog(await withAiredEpisodes(await withUpToDate(withSampleReviews(view), raw))));
  } catch {
    return null;
  }
}

// Made-up, and says so on the page. Real titles from this week's TMDB lists so
// the pictures are real; the person, the dates, the ratings and the review
// text are invented for the layout.
// With `who`, one of the made-up members (lib/members): their name, place,
// numbers, and titles shifted by their seed so no two look alike.
async function sampleProfile(who?: Member): Promise<PublicProfileView> {
  const [shows, movies, top] = await Promise.all([showRails.trending(), movieRails.trending(), movieRails.topRated()]);
  const t = (x: { id: number; poster_path?: string | null; backdrop_path?: string | null }, kind: "show" | "movie", title: string, date: string | null | undefined) => ({
    key: `${kind[0]}${x.id}`,
    kind,
    title,
    href: `/${kind}/${x.id}`,
    poster: image.poster(x.poster_path, "w780"),
    backdrop: image.backdrop(x.backdrop_path),
    year: (date ?? "").slice(0, 4),
  });
  const turn = <T,>(xs: T[]) => (who ? [...xs.slice(who.seed % Math.max(1, xs.length)), ...xs.slice(0, who.seed % Math.max(1, xs.length))] : xs);
  const films = turn(movies.map((m) => t(m, "movie", m.title, m.release_date)));
  const series = turn(shows.map((s) => t(s, "show", s.name, s.first_air_date)));
  const classics = turn(top.map((m) => t(m, "movie", m.title, m.release_date)));

  const day = (n: number) => new Date(Date.UTC(2026, 8, 25 - n)).toISOString().slice(0, 10);
  const diary = [...films.slice(0, 8), ...series.slice(0, 8)]
    .map((x, i) => ({ ...x, date: day(i * 2), rating: [8, 9, 7, 10, 6.5, 8, 9.5, 7][i % 8], loved: i % 3 === 0, rewatch: i % 5 === 2, reviewed: i < 4, episodes: x.kind === "show" ? `S1 E${(i % 6) + 1}` : undefined, episodeCount: x.kind === "show" ? 1 : undefined }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const blurbs = [
    "Sample review text. Tense from the first scene, and the last twenty minutes are the best thing in it.",
    "Sample review text. Gorgeous to look at, a little long in the middle, and I'd watch it again tomorrow.",
    "Sample review text. The cast carries a script that isn't quite sure what it wants to be.",
    "Sample review text. A slow start that pays off; the finale made the whole season click.",
  ];
  return {
    username: who?.username ?? "sample",
    displayName: who?.displayName ?? "Sample Viewer",
    avatar: null,
    banner: films[0]?.backdrop?.replace("/w1280/", "/original/") ?? null,
    bio: who?.bio ?? "Films on weekends, a series a week, and far too many lists.",
    location: who?.location ?? "Portland, OR",
    followers: who?.followers ?? 128,
    following: who?.following ?? 64,
    stats: who ? { films: who.films, shows: who.shows, episodes: who.shows * 31, hours: Math.round(who.films * 1.9 + who.shows * 14), ratings: who.reviews + 120, average: 7.2 } : { films: 214, shows: 37, episodes: 1893, hours: 1702, ratings: 188, average: 7.4 },
    favorites: classics.slice(0, 8),
    tracker: {
      shows: series.slice(0, 5).map((x, i) => ({ ...x, seen: Array.from({ length: [6, 14, 3, 20, 9][i] }, (_, e) => `1-${e + 1}`), aired: [[8, 10], [16], [10], [22, 8], [12]][i] })),
      films: films.slice(4, 9),
    },
    topFilms: classics.slice(0, 5),
    topShows: series.slice(1, 6),
    diary: diary.map((e, i) => (e.reviewed ? { ...e, review: { text: blurbs[i % blurbs.length], spoilers: false } } : e)),
    // Invented, like the rest of the sample: a steady habit with busier
    // weekends, from a fixed seed so it is the same on every load.
    activity: sampleActivity(),
    ratingValues: [4, 5, 6, 6, 6.5, 7, 7, 7, 7.5, 7.5, 8, 8, 8, 8, 8, 8.5, 8.5, 9, 9, 9, 9.5, 10, 10],
    genres: [
      { name: "Drama", share: 0.34 },
      { name: "Thriller", share: 0.22 },
      { name: "Sci-Fi", share: 0.18 },
      { name: "Comedy", share: 0.15 },
      { name: "Crime", share: 0.11 },
    ],
    reviews: diary.slice(0, 4).map((d, i) => ({ ...d, text: blurbs[i], date: d.date, spoilers: i === 3 })),
    categories: [
      { id: "shows", name: "Shows", custom: false, titles: series },
      { id: "movies", name: "Movies", custom: false, titles: films },
      { id: "upToDate", name: "Up to Date", custom: false, titles: series.slice(0, 3) },
      { id: "finished", name: "Finished", custom: false, titles: [...series.slice(3, 6), ...classics.slice(0, 8)] },
      { id: "favorites", name: "Favorites", custom: false, titles: classics.slice(0, 8) },
      { id: "list:l1", name: "Comfort rewatches", detail: "For the nights nothing new will do.", custom: true, titles: classics.slice(2, 14) },
      { id: "list:l2", name: "Best of 2026 so far", custom: true, titles: films.slice(0, 9) },
      { id: "list:l3", name: "Series worth the hype", detail: "Every one of these earned its finale.", custom: true, titles: series.slice(0, 7) },
    ],
    previewNote: `Sample profile${who ? ` (@${who.username})` : ""} — a made-up person with invented dates, ratings and review text, for judging the layout. Development only.`,
  };
}

function sampleActivity(): Record<string, number> {
  const out: Record<string, number> = {};
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 365; i++) {
    const d = new Date(Date.UTC(2026, 8, 25 - i));
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const r = rand();
    if (r < (weekend ? 0.75 : 0.45)) out[d.toISOString().slice(0, 10)] = 1 + Math.floor(rand() * (weekend ? 5 : 3));
  }
  return out;
}

// Three made-up reviews on the local preview, kept for testing until the
// user says to remove them (see docs/social-plan.md, "Before opening"): a long
// one, a short one, and one of a single episode, with spoilers. Each is
// marked as a sample on the page. Written for the preview; no one's real
// words. They sit after any real reviews the library holds.
function withSampleReviews(view: PublicProfileView): PublicProfileView {
  if (!view.owner) return view;
  const find = (key: string) => [...view.owner!.films, ...view.owner!.shows].find((t) => t.key === key);
  const eeaao = find("m545611");
  const barbie = find("m346698");
  const severance = find("s95396");
  const reviews: ReviewEntry[] = [];
  if (eeaao)
    reviews.push({
      ...eeaao,
      date: "2026-09-23",
      rating: 9.5,
      loved: true,
      rewatch: true,
      likes: 12,
      comments: 3,
      spoilers: false,
      sample: true,
      text: [
        "Second time through and it lands even harder. The first watch is all noise and invention; this time I could hear the quiet underneath it, a family trying to find one sentence they can all agree on.",
        "Michelle Yeoh carries every universe on her back and never lets you see the strain. Ke Huy Quan's \"be kind\" speech is the whole film in four lines, and I was a wreck by the laundromat.",
        "Still too long in the middle, and the hot-dog fingers are a joke that runs a lap past the finish line. I don't care. Nothing else looks like this.",
      ].join("\n\n"),
    });
  if (barbie)
    reviews.push({
      ...barbie,
      date: "2026-09-23",
      rating: 7,
      likes: 4,
      comments: 0,
      spoilers: false,
      sample: true,
      text: "Pinker, sharper and sadder than it had any right to be. The first act is a joy; the last one explains its own jokes a little too carefully. Ryan Gosling knew exactly what film he was in.",
    });
  if (severance)
    reviews.push({
      ...severance,
      date: "2026-09-21",
      rating: 10,
      loved: true,
      likes: 27,
      comments: 8,
      episode: "S2 E4",
      episodeTitle: "Woe's Hollow",
      spoilers: true,
      sample: true,
      text: [
        "The outdoor retreat episode, and the show at its strangest. Taking the innies out of the office and into the snow turns every rule we thought we knew into a question.",
        "That final scene by the water changes how I'll watch everything before it. Britt Lower is extraordinary.",
      ].join("\n\n"),
    });
  // Each review marks its title's latest Watchlog entry as reviewed, the way
  // a real one would.
  const marked = new Set<string>();
  const diary = view.diary.map((e) => {
    const r = reviews.find((x) => x.key === e.key);
    if (!r || marked.has(e.key)) return e;
    marked.add(e.key);
    return { ...e, reviewed: true, review: { text: r.text, spoilers: r.spoilers, likes: r.likes, comments: r.comments } };
  });
  return { ...view, diary, reviews: [...view.reviews, ...reviews.filter((r) => !view.reviews.some((x) => x.key === r.key))] };
}

// A year and more of made-up watching for the local preview's Watchlog, so
// the month cards can be judged full: every month of 2025, and 2026 up to the
// month before the library's own latest entries. Real titles from TMDB's
// popular and top-rated lists, so the pictures are real; the dates, ratings,
// hearts, rewatches and episodes are invented, from a fixed seed so they are
// the same on every load. Each entry is marked as a sample on the page. Kept
// for testing until the user says to remove it (see docs/social-plan.md).
async function withSampleWatchlog(view: PublicProfileView): Promise<PublicProfileView> {
  const [pf, tf, ps, ts] = await Promise.all([movieRails.popular(), movieRails.topRated(), showRails.popular(), showRails.topRated()]);
  const asTitle = (x: { id: number; poster_path?: string | null; backdrop_path?: string | null }, kind: "movie" | "show", title: string, date: string | null | undefined): ProfileTitle => ({
    key: `${kind === "show" ? "s" : "m"}${x.id}`,
    kind,
    title,
    href: `/${kind}/${x.id}`,
    poster: image.poster(x.poster_path, "w780"),
    backdrop: image.backdrop(x.backdrop_path),
    year: (date ?? "").slice(0, 4),
  });
  const films = [...pf, ...tf].filter((m) => m.backdrop_path).map((m) => asTitle(m, "movie", m.title, m.release_date));
  const shows = [...ps, ...ts].filter((x) => x.backdrop_path).map((x) => asTitle(x, "show", x.name, x.first_air_date));
  if (films.length === 0 || shows.length === 0) return view;

  let seed = 20260927;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  const latest = view.diary[0]?.date.slice(0, 7) ?? "2026-09";
  const months: string[] = [];
  for (let y = 2025; y <= 2026; y++)
    for (let m = 1; m <= 12; m++) {
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      if (ym < latest) months.push(ym);
    }

  const samples: DiaryEntry[] = [];
  for (const ym of months) {
    const [y, m] = ym.split("-").map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    // Some months busy, some quiet, the way a real year goes.
    const count = 4 + Math.floor(rand() * 11);
    for (let i = 0; i < count; i++) {
      const date = `${ym}-${String(1 + Math.floor(rand() * days)).padStart(2, "0")}`;
      if (rand() < 0.45) {
        const t = pick(films);
        samples.push({ ...t, date, rating: rand() < 0.7 ? Math.round((5 + rand() * 5) * 2) / 2 : null, loved: rand() < 0.2, rewatch: rand() < 0.12, reviewed: rand() < 0.15, sample: true });
      } else {
        const t = pick(shows);
        const season = 1 + Math.floor(rand() * 3);
        const first = 1 + Math.floor(rand() * 6);
        const n = 1 + Math.floor(rand() * 4);
        samples.push({
          ...t,
          date,
          episodes: n === 1 ? `S${season} E${first}` : `S${season} E${first}–E${first + n - 1}`,
          episodeCount: n,
          rating: rand() < 0.3 ? Math.round((6 + rand() * 4) * 2) / 2 : null,
          loved: rand() < 0.1,
          rewatch: false,
          reviewed: rand() < 0.08,
          sample: true,
        });
      }
    }
  }
  // The reviewed ones get a few lines of review, so the review sheet has
  // something to show.
  const lines = [
    "Tense from the first scene, and the last twenty minutes are the best thing in it.",
    "Gorgeous to look at, a little long in the middle, and I'd watch it again tomorrow.",
    "The cast carries a script that isn't quite sure what it wants to be.",
    "A slow start that pays off. By the end I was completely hooked.",
    "Funnier than I expected, and kinder too. Exactly what I needed this week.",
  ];
  for (const e of samples) if (e.reviewed) e.review = { text: pick(lines), spoilers: false, likes: Math.floor(rand() * 20), comments: Math.floor(rand() * 5) };
  const diary = [...view.diary, ...samples].sort((a, b) => b.date.localeCompare(a.date));
  const activity = { ...view.activity };
  for (const e of samples) activity[e.date] = (activity[e.date] ?? 0) + (e.episodeCount ?? 1);
  return { ...view, diary, activity };
}

// Two made-up lists for the local preview, whose library has none, so the
// Categories tab can be judged with the app's lists in it. Drawn from the
// library's own titles. Kept for testing until the user says to remove it
// (see docs/social-plan.md).
function withSampleLists(view: PublicProfileView): PublicProfileView {
  if (!view.owner) return view;
  const { films, shows } = view.owner;
  const lists: CategoryEntry[] = [
    { id: "list:sample-1", name: "Comfort watches", detail: "For the nights nothing new will do.", custom: true, sample: true, titles: [...shows.slice(0, 3), ...films.slice(0, 3)] },
    { id: "list:sample-2", name: "Watch with Mum", detail: null, custom: true, sample: true, titles: [...films.slice(3, 7), ...shows.slice(3, 5)] },
  ].filter((l) => l.titles.length > 0);
  return { ...view, categories: [...view.categories, ...lists] };
}

/**
 * The members' reviews of one title, for its page. Until the public tables
 * exist these come from the development previews only (/u/preview and
 * /u/sample); once they do, this reads `public_entries` instead.
 */
export async function reviewsOfTitle(key: string): Promise<{ review: ReviewEntry; username: string; avatar: string | null }[]> {
  if (!DEV) return [];
  const views = (await Promise.all(["preview", "sample"].map(loadProfile))).filter((v): v is PublicProfileView => !!v);
  const out: { review: ReviewEntry; username: string; avatar: string | null }[] = [];
  for (const v of views) {
    const r = v.reviews.find((x) => x.key === key);
    if (r) out.push({ review: r, username: v.username, avatar: v.avatar });
  }
  return [...out, ...sampleReviewers(key, views[0])];
}

// Three made-up members' reviews on every title's page in development, so
// the Reviews section can be judged with several people in it. The words
// fit any film or series. Kept for testing until the user says to remove it
// (see docs/social-plan.md).
function sampleReviewers(key: string, like?: PublicProfileView): { review: ReviewEntry; username: string; avatar: string | null }[] {
  // The title's own name, picture and link, borrowed from whichever preview
  // review or entry has it, else left plain.
  const t = like?.reviews.find((r) => r.key === key) ?? like?.diary.find((e) => e.key === key);
  const base = {
    key,
    kind: key.startsWith("s") ? ("show" as const) : ("movie" as const),
    title: t?.title ?? "",
    href: t?.href ?? `/${key.startsWith("s") ? "show" : "movie"}/${key.slice(1)}`,
    poster: t?.poster ?? null,
    backdrop: t?.backdrop ?? null,
    year: t?.year ?? "",
    sample: true,
  };
  return [
    {
      username: "moviemarta",
      avatar: null,
      review: {
        ...base,
        date: "2026-09-26",
        rating: 8.5,
        loved: true,
        spoilers: false,
        likes: 31,
        comments: 5,
        text: [
          "Went in knowing almost nothing and came out wanting to tell everyone about it. The first half takes its time, but every scene is doing something, and by the end it all clicks into place.",
          "The performances carry it. There's one quiet scene near the middle that I'll be thinking about for a while.",
        ].join("\n\n"),
      },
    },
    {
      username: "joelwatches",
      avatar: null,
      review: {
        ...base,
        date: "2026-09-24",
        rating: 6,
        spoilers: false,
        likes: 9,
        comments: 2,
        text: "Looks gorgeous and the music is great, but it lost me for a stretch in the middle. Worth seeing on the biggest screen you can find.",
      },
    },
    {
      username: "night.owl.nadia",
      avatar: null,
      review: {
        ...base,
        date: "2026-09-19",
        rating: 9.5,
        rewatch: true,
        spoilers: true,
        likes: 54,
        comments: 12,
        text: "Second time through and I caught so much I missed the first time. The ending lands completely differently once you know where it's going, and the last scene wrecked me all over again.",
      },
    },
  ];
}
