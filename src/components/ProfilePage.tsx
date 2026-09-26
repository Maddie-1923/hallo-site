import Link from "next/link";
import type { ListEntry, ProfileTitle, PublicProfileView, ReviewEntry } from "@/lib/public-profile";
import { nightTokens } from "@/lib/theme";
import { FollowPill } from "./FollowPill";
import { BackToTop, ProfileSections } from "./ProfileNav";
import { ProfileDiary } from "./ProfileDiary";

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
          one height between them, then the rest of each column. */}
      <div className="grid gap-x-5 gap-y-4 mt-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] items-stretch">
        <ProfileCard v={v} />
        <div className="rounded-[24px] bg-card border border-hair p-2.5 flex">
          <NumberTiles v={v} />
        </div>
        <div className="flex flex-col gap-4">
          <Dashboard v={v} />
        </div>
        <div className="flex flex-col">
          <FavouriteCard v={v} />
        </div>
      </div>

      {/* One section at a time under the tabs, swapped in place. */}
      <ProfileSections
        sections={[
          { id: "activity", label: "Recent activity", content: <ActivityList v={v} /> },
          {
            id: "diary",
            label: "Diary",
            count: v.diary.length,
            content: v.diary.length > 0 ? <ProfileDiary entries={v.diary} /> : <Empty>Nothing logged yet.</Empty>,
          },
          {
            id: "reviews",
            label: "Reviews",
            count: v.reviews.length,
            content:
              v.reviews.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {v.reviews.map((r) => (
                    <ReviewCard key={r.key} r={r} />
                  ))}
                </div>
              ) : (
                <Empty>No reviews yet.</Empty>
              ),
          },
          {
            id: "lists",
            label: "Lists",
            count: v.lists.length,
            content:
              v.lists.length > 0 ? (
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
                  {v.lists.map((l) => (
                    <ListCard key={l.id} l={l} />
                  ))}
                </div>
              ) : (
                <Empty>No lists yet.</Empty>
              ),
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

// The quick-glance panels under the person's card: how they rate beside what
// they watch most, and a year of watching. The first row grows to take up
// any slack, so the column ends level with the one beside it.
function Dashboard({ v }: { v: PublicProfileView }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 flex-1">
        <Panel title="Ratings">
          <RatingsSpread values={v.ratingValues} />
        </Panel>
        <Panel title="Top genres">
          <TopGenres genres={v.genres} />
        </Panel>
      </div>
      <Panel title="Watch calendar">
        <WatchCalendar activity={v.activity} />
      </Panel>
    </>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] bg-card border border-hair px-[clamp(14px,1.6vw,20px)] py-3.5 flex flex-col">
      <div className="text-[11px] font-bold tracking-[.14em] uppercase text-dim mb-2.5">{title}</div>
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

// The last 53 weeks as a grid of days, a column a week, Sunday at the top,
// each day shaded by how much was watched on it.
function WatchCalendar({ activity }: { activity: Record<string, number> }) {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 52 * 7 - end.getUTCDay());
  const days: { key: string; n: number; month: number; date: number }[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    days.push({ key, n: activity[key] ?? 0, month: d.getUTCMonth(), date: d.getUTCDate() });
  }
  const weeks = Math.ceil(days.length / 7);
  const active = days.filter((d) => d.n > 0).length;
  // Longest run of consecutive watch days in the window.
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = d.n > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const shade = (n: number) =>
    n === 0 ? "var(--card-hi)" : `color-mix(in srgb, var(--accent-fill) ${n === 1 ? 35 : n <= 3 ? 65 : 100}%, var(--card-hi))`;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div>
      <div className="flex gap-5 mb-2.5 text-[12.5px]">
        <span>
          <b className="text-ink">{active}</b> <span className="text-dim">{active === 1 ? "day" : "days"} watched</span>
        </span>
        <span>
          <b className="text-ink">{best}</b> <span className="text-dim">{best === 1 ? "day" : "days"} best streak</span>
        </span>
      </div>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridTemplateRows: "repeat(7, auto)", gridAutoFlow: "column" }}>
        {days.map((d) => (
          <div key={d.key} title={`${d.key}: ${d.n}`} className="aspect-square rounded-[2px]" style={{ background: shade(d.n) }} />
        ))}
      </div>
      <div className="grid mt-1.5 text-[10.5px] text-dim" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
        {Array.from({ length: weeks }, (_, w) => {
          const first = days[w * 7];
          return <span key={w}>{first && first.date <= 7 ? months[first.month] : ""}</span>;
        })}
      </div>
    </div>
  );
}

// How they rate: a bar for each whole heart from one to ten.
function RatingsSpread({ values }: { values: number[] }) {
  const buckets = Array.from({ length: 10 }, (_, i) => values.filter((x) => Math.ceil(x) === i + 1).length);
  const most = Math.max(1, ...buckets);
  const avg = values.length ? values.reduce((x, y) => x + y, 0) / values.length : null;
  return (
    <div className="flex-1 flex flex-col">
      <div className="text-[12.5px] mb-2.5">
        <b className="text-ink">{values.length}</b> <span className="text-dim">ratings{avg != null ? ` · avg ${avg.toFixed(1)}` : ""}</span>
      </div>
      <div className="flex items-end gap-1 flex-1 min-h-[56px]">
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
    <ul className="m-0 p-0 list-none grid gap-2">
      {genres.map((g) => (
        <li key={g.name} className="grid grid-cols-[76px_1fr_34px] items-center gap-2 text-[12.5px]">
          <span className="truncate text-ink">{g.name}</span>
          <span className="h-[7px] rounded-full bg-card-hi overflow-hidden">
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
            {v.stats.ratings} ratings · {v.reviews.length} reviews · {v.lists.length} lists
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

// The Favourites card: their top five films, their top five series, and the
// five things they watched most recently, films and series mixed, all at the
// same poster size. An empty slot is drawn as an outline so each row keeps
// its shape while it fills up.
function FavouriteCard({ v }: { v: PublicProfileView }) {
  // The latest five different titles from the diary, newest first.
  const recent: ProfileTitle[] = [];
  for (const e of v.diary) {
    if (recent.length === 5) break;
    if (!recent.some((r) => r.key === e.key)) recent.push(e);
  }
  return (
    <div className="flex-1 rounded-[24px] bg-card border border-hair px-[clamp(14px,1.6vw,20px)] py-3.5 flex flex-col justify-between gap-3">
      <h2 className="!text-[clamp(22px,2vw,28px)] leading-none">Favourites</h2>
      <div>
        <Label>Top 5 films</Label>
        <FiveRow titles={v.topFilms} />
      </div>
      <div>
        <Label>Top 5 series</Label>
        <FiveRow titles={v.topShows} />
      </div>
      <div>
        <Label>Recent watches</Label>
        <FiveRow titles={recent} />
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold tracking-[.14em] uppercase text-dim mb-2">{children}</div>;
}

function FiveRow({ titles }: { titles: ProfileTitle[] }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: 5 }, (_, i) =>
        titles[i] ? (
          <PosterLink key={titles[i].key} t={titles[i]} small />
        ) : (
          <div key={`empty${i}`} aria-hidden className="aspect-[2/3] rounded-[8px] border border-dashed border-hair" />
        ),
      )}
    </div>
  );
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
    <ul className="m-0 p-0 list-none">
      {items.map((it, i) => (
        <li key={it.key} className={i > 0 ? "border-t border-hair" : ""}>
          <Link href={it.t.href} className="group flex items-center gap-4 py-3 no-underline text-ink">
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

function ReviewCard({ r }: { r: ReviewEntry }) {
  return (
    <article className="rounded-[20px] bg-card border border-hair p-4 flex gap-4">
      <Link href={r.href} className="w-[72px] shrink-0">
        {r.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.poster} alt={r.title} className="w-full aspect-[2/3] rounded-[8px] object-cover" />
        )}
      </Link>
      <div className="min-w-0">
        <Link href={r.href} className="display text-[22px] leading-[.95] text-ink no-underline hover:text-accent">
          {r.title} <span className="text-dim text-[16px]">{r.year}</span>
        </Link>
        <div className="text-[12.5px] text-dim mt-1 flex gap-2">
          {r.date && <span>{prettyDate(r.date)}</span>}
          {r.rating != null && <Rating value={r.rating} />}
        </div>
        {r.spoilers ? (
          <details className="mt-2 text-[14px] text-bone">
            <summary className="cursor-pointer text-dim text-[13px]">Contains spoilers — show review</summary>
            <p className="m-0 mt-2 leading-[1.5]">{r.text}</p>
          </details>
        ) : (
          <p className="m-0 mt-2 text-[14px] leading-[1.5] text-bone line-clamp-5">{r.text}</p>
        )}
      </div>
    </article>
  );
}

function ListCard({ l }: { l: ListEntry }) {
  return (
    <div className="rounded-[20px] bg-card border border-hair p-4">
      {/* Four posters fanned, the way a list's cover reads on Letterboxd. */}
      <div className="relative h-[120px] mb-3">
        {l.posters.map((p, i) => (
          <div
            key={i}
            className="absolute top-0 h-full aspect-[2/3] rounded-[6px] overflow-hidden bg-card-hi border border-page shadow-[4px_0_10px_rgba(0,0,0,.35)]"
            style={{ left: `${i * 22}%`, zIndex: 4 - i }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p && <img src={p} alt="" className="w-full h-full object-cover" />}
          </div>
        ))}
      </div>
      <div className="display text-[22px] leading-none">{l.name}</div>
      <div className="text-[12.5px] text-dim mt-1">{l.count} titles</div>
      {l.detail && <p className="m-0 mt-2 text-[13px] text-dim line-clamp-2">{l.detail}</p>}
    </div>
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
