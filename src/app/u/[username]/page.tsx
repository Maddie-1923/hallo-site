import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProfilePage } from "@/components/ProfilePage";
import { isArchive } from "@/lib/archive";
import { profileFromArchive, withAiredEpisodes, type PublicProfileView, type ReviewEntry } from "@/lib/public-profile";
import { image, movieRails, showRails } from "@/lib/tmdb";

// A public profile at /u/<username>.
//
// Real profiles are read from the public tables once they exist (see
// docs/social-plan.md, steps 1 and 2); until then every username is a 404.
// Two previews exist on a development machine only, never in a build that
// ships:
// - /u/preview draws a library file from disk (PROFILE_PREVIEW_FILE), so a
//   real library can be seen in the layout without anything being uploaded;
// - /u/sample draws a made-up profile from this week's TMDB titles, so the
//   layout can be judged with every section full.
const DEV = process.env.NODE_ENV === "development";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} — Kodigo` };
}

export default async function UserProfile({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  let view: PublicProfileView | null = null;
  if (DEV && username === "preview") view = await previewFromFile();
  if (DEV && username === "sample") view = await sampleProfile();
  if (!view) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <ProfilePage view={view} />
      <SiteFooter />
    </div>
  );
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
    }, true);
    return await withAiredEpisodes(withSampleReviews(view));
  } catch {
    return null;
  }
}

// Made-up, and says so on the page. Real titles from this week's TMDB lists so
// the pictures are real; the person, the dates, the ratings and the review
// text are invented for the layout.
async function sampleProfile(): Promise<PublicProfileView> {
  const [shows, movies, top] = await Promise.all([showRails.trending(), movieRails.trending(), movieRails.topRated()]);
  const t = (x: { id: number; poster_path?: string | null; backdrop_path?: string | null }, kind: "show" | "movie", title: string, date: string | null | undefined) => ({
    key: `${kind[0]}${x.id}`,
    kind,
    title,
    href: `/${kind}/${x.id}`,
    poster: image.poster(x.poster_path, "w342"),
    backdrop: image.backdrop(x.backdrop_path),
    year: (date ?? "").slice(0, 4),
  });
  const films = movies.map((m) => t(m, "movie", m.title, m.release_date));
  const series = shows.map((s) => t(s, "show", s.name, s.first_air_date));
  const classics = top.map((m) => t(m, "movie", m.title, m.release_date));

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
    username: "sample",
    displayName: "Sample Viewer",
    avatar: null,
    banner: films[0]?.backdrop?.replace("/w1280/", "/original/") ?? null,
    bio: "A made-up profile for trying the layout. Films on weekends, a series a week, and far too many lists.",
    followers: 128,
    following: 64,
    stats: { films: 214, shows: 37, episodes: 1893, hours: 1702, ratings: 188, average: 7.4 },
    favorites: classics.slice(0, 8),
    tracker: {
      shows: series.slice(0, 5).map((x, i) => ({ ...x, seen: Array.from({ length: [6, 14, 3, 20, 9][i] }, (_, e) => `1-${e + 1}`), aired: [[8, 10], [16], [10], [22, 8], [12]][i] })),
      films: films.slice(4, 9),
    },
    topFilms: classics.slice(0, 5),
    topShows: series.slice(1, 6),
    diary,
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
    lists: [
      { id: "l1", name: "Comfort rewatches", detail: "For the nights nothing new will do.", count: 12, posters: classics.slice(0, 4).map((x) => x.poster) },
      { id: "l2", name: "Best of 2026 so far", detail: null, count: 9, posters: films.slice(0, 4).map((x) => x.poster) },
      { id: "l3", name: "Series worth the hype", detail: "Every one of these earned its finale.", count: 7, posters: series.slice(0, 4).map((x) => x.poster) },
    ],
    previewNote: "Sample profile — a made-up person with invented dates, ratings and review text, for judging the layout. Development only.",
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
  return { ...view, reviews: [...view.reviews, ...reviews.filter((r) => !view.reviews.some((x) => x.key === r.key))] };
}
