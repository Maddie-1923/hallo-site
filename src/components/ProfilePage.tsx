import Link from "next/link";
import type { ProfileTitle, PublicProfileView, ReviewEntry } from "@/lib/public-profile";
import { nightTokens } from "@/lib/theme";
import { FollowPill } from "./FollowPill";
import { ReviewActions } from "./ReviewActions";
import { ReviewHeading } from "./ReviewSheet";
import { ProfileCategories } from "./ProfileCategories";
import { BackToTop, ProfileSections } from "./ProfileNav";
import { ProfileDiary } from "./ProfileDiary";
import { FavouritesCard } from "./FavouritesCard";
import { MonthCalendar } from "./MonthCalendar";
import { MiniTracker } from "./MiniTracker";

// A public profile, laid out as a bento board after the reference the user
// chose: one big rounded banner left to its picture, then the person's card
// and their favourites side by side, then pill tabs that swap one section at
// a time in place below them. The full diary,
// reviews, lists and favourites follow below, and the tabs jump to them.
//
// Server-rendered and read-only. Following is drawn but not live until the
// accounts side opens.

const GUTTER = "px-[clamp(16px,3.2vw,64px)]";
// The banner's corner radius.
const R = 28;
// The profile photo's size and where it sits, shared by the banner (which
// draws it) and the card (which leaves room for it).
const AVATAR = "clamp(92px, 9vw, 128px)";
const AVATAR_LEFT = "clamp(16px, 2.2vw, 28px)";

export function ProfilePage({ view: v }: { view: PublicProfileView }) {
  const bannerArt = v.banner ?? v.favorites[0]?.backdrop ?? v.diary[0]?.backdrop ?? null;

  return (
    <main className={`w-full ${GUTTER} pt-[clamp(12px,2.2vw,32px)] pb-20`}>
      {v.previewNote && (
        <div className="mb-3 rounded-full border border-hair bg-card px-4 py-2 text-[12.5px] text-dim text-center">{v.previewNote}</div>
      )}

      <Banner v={v} art={bannerArt} />

      {/* Two columns that end on the same line: the person's card, how they
          rate, what they watch and their calendar on the left; the numbers
          and their favourites on a narrower right. The grid stretches both
          to the taller, and the growable row on each side takes the slack. */}
      {/* Two rows so the pairs match: the person's card beside the numbers,
          one height between them; then their favourites on the left and the
          stat panels on the right. The left column is the narrower one, so
          the favourites' posters stay small and the calendar gets the room. */}
      <div className="grid gap-x-5 gap-y-4 mt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:grid-rows-[auto_1fr] items-stretch">
        <ProfileCard v={v} />
        <div className="rounded-[24px] bg-card border border-hair p-2.5 flex">
          <NumberTiles v={v} />
        </div>
        <div className="flex flex-col">
          <FavouriteCard v={v} />
        </div>
        <div className="flex flex-col">
          <MiniTracker shows={v.tracker.shows} films={v.tracker.films} owner={!!v.owner} />
        </div>
      </div>

      {/* One section at a time under the tabs, swapped in place. */}
      <ProfileSections
        sections={[
          {
            id: "reviews",
            label: "Reviews",
            count: v.reviews.length,
            content:
              v.reviews.length > 0 ? (
                <div className="grid gap-[6px]">
                  {v.reviews.map((r) => (
                    <ReviewCard key={r.key} r={r} username={v.username} avatar={v.avatar} />
                  ))}
                </div>
              ) : (
                <Empty>No reviews yet.</Empty>
              ),
          },
          { id: "activity", label: "Recent activity", content: <ActivityList v={v} /> },
          {
            // Called the Watchlog rather than a diary, which is Letterboxd's word.
            id: "watchlog",
            label: "Watchlog",
            count: v.diary.length,
            content: v.diary.length > 0 ? <ProfileDiary entries={v.diary} owner={!!v.owner} username={v.username} avatar={v.avatar} /> : <Empty>Nothing logged yet.</Empty>,
          },
          {
            // The app's profile grid: its eight built-in categories, then the
            // person's own lists.
            id: "categories",
            label: "Categories",
            count: v.categories.length,
            content: v.categories.length > 0 ? <ProfileCategories categories={v.categories} owner={!!v.owner} username={v.username} /> : <Empty>Nothing in any category yet.</Empty>,
          },
          {
            id: "favourites",
            label: "Favourites",
            count: v.favorites.length,
            content:
              v.favorites.length > 0 ? (
                <div className="grid gap-3 grid-cols-3 sm:grid-cols-5 lg:grid-cols-8">
                  {v.favorites.map((t) => (
                    <PosterLink key={t.key} t={t} />
                  ))}
                </div>
              ) : (
                <Empty>No favourites yet.</Empty>
              ),
          },
          { id: "stats", label: "Stats", content: <Dashboard v={v} /> },
        ]}
      />

      <BackToTop />
    </main>
  );
}

function Banner({ v, art }: { v: PublicProfileView; art: string | null }) {
  return (
    <section id="top" className="relative scroll-mt-24">
      <div
        className="relative overflow-hidden h-[clamp(420px,40vw,540px)]"
        style={{ borderRadius: R, ...nightTokens }}
      >
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, var(--accent-night), #1a1a19)" }} />
        )}


        {/* No name across the picture: the handle on the card is who this
            is. The page's heading is still the handle, for screen readers
            and search. */}
        <h1 className="sr-only">@{v.username}</h1>
      </div>


    </section>
  );
}

// The Stats tab: how they rate, what they watch most, and a month of
// watching, three in a row.
function Dashboard({ v }: { v: PublicProfileView }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Panel title="Ratings">
        <RatingsSpread values={v.ratingValues} />
      </Panel>
      <Panel title="Top genres">
        <TopGenres genres={v.genres} />
      </Panel>
      <Panel title="Watch calendar">
        <MonthCalendar activity={v.activity} />
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] bg-card border border-hair px-[clamp(12px,1.2vw,16px)] py-3 flex flex-col min-w-0">
      <div className="text-[10.5px] font-bold tracking-[.14em] uppercase text-dim mb-2">{title}</div>
      {children}
    </div>
  );
}

function NumberTiles({ v }: { v: PublicProfileView }) {
  const s = v.stats;
  const tiles: [string, string | number][] = [
    ["Hours", s.hours.toLocaleString("en")],
    ["Films", s.films],
    ["Episodes", s.episodes.toLocaleString("en")],
    ["Avg ♥", s.average ?? "—"],
  ];
  return (
    <div className="flex-1 grid grid-cols-4 gap-2">
      {tiles.map(([label, value]) => (
        <div key={label} className="rounded-[16px] bg-card-hi py-2.5 text-center flex flex-col items-center justify-center">
          <div className="display text-[clamp(24px,2.2vw,32px)] leading-none text-accent">{value}</div>
          <div className="text-[10px] font-bold tracking-[.14em] uppercase text-dim mt-1.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

function RatingsSpread({ values }: { values: number[] }) {
  const buckets = Array.from({ length: 10 }, (_, i) => values.filter((x) => Math.ceil(x) === i + 1).length);
  const most = Math.max(1, ...buckets);
  const avg = values.length ? values.reduce((x, y) => x + y, 0) / values.length : null;
  return (
    <div className="flex-1 flex flex-col">
      <div className="text-[12px] mb-2">
        <b className="text-ink">{values.length}</b> <span className="text-dim">ratings{avg != null ? ` · avg ${avg.toFixed(1)}` : ""}</span>
      </div>
      <div className="flex items-end gap-[3px] h-[64px]">
        {buckets.map((n, i) => (
          <div key={i} title={`${i + 1}: ${n}`} className="flex-1 rounded-t-[3px] bg-accent-fill" style={{ height: `${Math.max(4, (n / most) * 100)}%`, opacity: n ? 1 : 0.18 }} />
        ))}
      </div>
      <div className="flex justify-between text-[10.5px] text-dim mt-1.5">
        <span>♥ 1</span>
        <span>♥ 10</span>
      </div>
    </div>
  );
}

function TopGenres({ genres }: { genres: { name: string; share: number }[] }) {
  if (genres.length === 0) return <p className="m-0 text-sm text-dim">Nothing tracked yet.</p>;
  const most = Math.max(...genres.map((g) => g.share));
  return (
    <ul className="m-0 p-0 list-none grid gap-[7px]">
      {genres.map((g) => (
        <li key={g.name} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_30px] items-center gap-1.5 text-[11.5px]">
          <span className="truncate text-ink">{g.name}</span>
          <span className="h-[5px] rounded-full bg-card-hi overflow-hidden">
            <span className="block h-full rounded-full bg-accent-fill" style={{ width: `${(g.share / most) * 100}%` }} />
          </span>
          <span className="text-right text-dim">{Math.round(g.share * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}

// The person's card, kept to one line: photo, handle and what they have put
// here on the left, followers on the right. A bio, when there is one, runs
// underneath.
// The person's card: handle and what they have put here, followers below,
// Follow on the right. It starts just past the photo hanging from the banner,
// so it sits beside the photo instead of running under it.
function ProfileCard({ v }: { v: PublicProfileView }) {
  return (
    <div className="relative flex">
      {/* The photo, as the app draws it: a circle in a ring of the page's own
          colour, crossing the banner's bottom edge so the ring reads as the
          banner being interrupted by the person in front of it. Anchored to
          the card rather than the banner, so its foot sits on the card's
          bottom line whatever the card holds. */}
      <div
        className="absolute z-10 rounded-full overflow-hidden bg-accent-fill text-on-accent flex items-center justify-center display shadow-[0_0_0_4px_var(--page),0_10px_28px_rgba(0,0,0,.45)]"
        style={{ width: AVATAR, height: AVATAR, left: AVATAR_LEFT, bottom: 0, fontSize: `calc(${AVATAR} * 0.45)` }}
      >
        {v.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          (v.displayName[0] ?? "?").toUpperCase()
        )}
      </div>
    <div
      className="flex-1 rounded-[24px] bg-card border border-hair px-[clamp(14px,1.6vw,20px)] py-3 flex flex-col justify-center gap-2"
      style={{ marginLeft: `calc(${AVATAR_LEFT} + ${AVATAR} + 16px)` }}
    >
      {/* Everything about the person down the left: the handle, what they
          have put here, who follows them. The Follow button alone on the
          right, its top level with the top of the handle, with room to be a
          proper size. */}
      <div className="flex items-start gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="display text-[clamp(20px,1.8vw,26px)] leading-[.9] truncate">@{v.username}</div>
          <div className="text-[12px] text-dim truncate mt-0.5">
            {v.stats.ratings} ratings · {v.reviews.length} reviews · {v.categories.filter((c) => c.custom).length} lists
          </div>
          <div className="flex items-center gap-4 text-[12.5px] mt-1">
            <span>
              <b className="text-ink">{v.followers}</b> <span className="text-dim">followers</span>
            </span>
            <span>
              <b className="text-ink">{v.following}</b> <span className="text-dim">following</span>
            </span>
          </div>
        </div>
        {/* A pixel down, to where the handle's capitals start; FollowPill
            sizes itself to the handle's line and centres on those capitals.
            A flex box so the button is laid out as a box, not as a word
            sitting on a text baseline. */}
        <div className="shrink-0 mt-px flex">
          <FollowPill />
        </div>
      </div>
      {v.bio && <p className="m-0 text-[13px] leading-[1.45] text-dim line-clamp-2">{v.bio}</p>}
    </div>
    </div>
  );
}

// The Favourites card (FavouritesCard): top films and series, editable by
// the owner, and the five most recent watches worked out from the diary.
function FavouriteCard({ v }: { v: PublicProfileView }) {
  const recent: ProfileTitle[] = [];
  for (const e of v.diary) {
    if (recent.length === 5) break;
    if (!recent.some((r) => r.key === e.key)) recent.push(e);
  }
  return <FavouritesCard username={v.username} autoFilms={v.topFilms} autoShows={v.topShows} recent={recent} owner={v.owner} />;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-dim m-0">{children}</p>;
}

// What they have been doing lately, newest first: watches from the diary
// (with the rating and heart they gave), and reviews they wrote, as one
// timeline of short sentences.
function ActivityList({ v }: { v: PublicProfileView }) {
  type Item = { key: string; date: string; t: ProfileTitle; verb: string; detail?: string; rating?: number | null; loved?: boolean };
  const items: Item[] = [
    ...v.diary.map((e): Item => ({
      key: `w${e.key}${e.date}`,
      date: e.date,
      t: e,
      verb: e.rewatch ? "Rewatched" : "Watched",
      detail: e.episodes,
      rating: e.rating,
      loved: e.loved,
    })),
    ...v.reviews.filter((r) => r.date).map((r): Item => ({ key: `r${r.key}`, date: r.date!, t: r, verb: "Reviewed", rating: r.rating })),
  ]
    .sort((x, y) => y.date.localeCompare(x.date))
    .slice(0, 10);

  if (items.length === 0) return <p className="text-sm text-dim m-0">Nothing yet.</p>;
  return (
    // Each entry in its own rounded shell, as in the Diary.
    <ul className="m-0 p-0 list-none grid gap-[6px]">
      {items.map((it) => (
        <li key={it.key} className="rounded-[14px] bg-card-hi">
          <Link href={it.t.href} className="group flex items-center gap-4 px-3 py-2 no-underline text-ink">
            <span className="w-[72px] aspect-video rounded-[6px] overflow-hidden bg-card shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.t.backdrop && <img src={it.t.backdrop} alt="" className="w-full h-full object-cover" />}
            </span>
            <span className="min-w-0 flex-1 text-[14.5px]">
              <span className="text-dim">{it.verb} </span>
              <span className="font-semibold group-hover:text-accent transition-colors">{it.t.title}</span>
              {it.detail && <span className="text-dim"> · {it.detail}</span>}
            </span>
            <span className="flex items-center gap-2.5 shrink-0 text-[12.5px]">
              {it.rating != null && <Rating value={it.rating} />}
              {it.loved && <span className="text-loved">♥</span>}
              <span className="text-dim w-[92px] text-right">{prettyDate(it.date)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// One review, laid out after the way Letterboxd shows reviews on a profile:
// the poster on the left, then who watched what and when, the title, the
// marks, the review in readable paragraphs, and like / comment / share under
// it. A review of a single episode says which one, which a films-only site
// has no way to do. Spoilers stay hidden behind a tap.
// Spaced like the review sheet (components/ReviewSheet.tsx): one 16px inset
// all round, the heading (who, title, stars) set close as a group, and 16px
// between every group under it.
function ReviewCard({ r, username, avatar }: { r: ReviewEntry; username: string; avatar: string | null }) {
  const paragraphs = r.text.split(/\n\s*\n/);
  const body = (
    <div className="mt-4 grid gap-2.5 text-[13.5px] leading-[1.6] text-bone max-w-[80ch]">
      {paragraphs.map((p, i) => (
        <p key={i} className="m-0">
          {p}
        </p>
      ))}
    </div>
  );
  return (
    <article className="rounded-[20px] bg-card-hi p-4 flex gap-4">
      <Link href={r.href} className="w-[clamp(64px,7vw,88px)] shrink-0 self-start">
        {r.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.poster} alt={r.title} className="w-full aspect-[2/3] rounded-[8px] object-cover border border-hair" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <ReviewHeading username={username} avatar={avatar} r={{ ...r, episodes: r.episode }} titleHref={r.href} />

        {r.spoilers ? (
          <details className="mt-4 group/sp">
            <summary className="list-none cursor-pointer inline-flex items-center gap-2 text-[13px] text-dim hover:text-ink [&::-webkit-details-marker]:hidden">
              <span className="px-2 py-[2px] rounded-full bg-card border border-hair text-[11px] font-bold uppercase tracking-[.08em]">Spoilers</span>
              <span className="group-open/sp:hidden">This review gives things away. Show it anyway.</span>
              <span className="hidden group-open/sp:inline">Hide it again</span>
            </summary>
            {body}
          </details>
        ) : (
          body
        )}

        <ReviewActions likes={r.likes} comments={r.comments} title={r.title} shareHref={`/u/${username}/review/${r.key}`} className="mt-4" />
      </div>
    </article>
  );
}


function PosterLink({ t, small = false }: { t: ProfileTitle; small?: boolean }) {
  return (
    <Link href={t.href} title={t.title} className="group block no-underline">
      <div className={`aspect-[2/3] overflow-hidden bg-card-hi border border-hair group-hover:border-accent transition-colors ${small ? "rounded-[8px]" : "rounded-[10px]"}`}>
        {t.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.poster} alt={t.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-dim">{t.title}</div>
        )}
      </div>
    </Link>
  );
}

/** A rating out of ten, as the app's heart and figure. */
function Rating({ value }: { value: number }) {
  return (
    <span className="whitespace-nowrap text-accent font-semibold text-[12.5px]">
      ♥ {Number.isInteger(value) ? value : value.toFixed(1)}
    </span>
  );
}

function prettyDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
