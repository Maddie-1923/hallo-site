import Link from "next/link";
import type { DiaryEntry, ListEntry, ProfileTitle, PublicProfileView, ReviewEntry } from "@/lib/public-profile";
import { nightTokens } from "@/lib/theme";
import { FollowPill } from "./FollowPill";

// A public profile, laid out as a bento board after the reference the user
// chose: one big rounded banner left to its picture, then the person's card
// and their favourites side by side, then pill tabs over the sections below. The full diary,
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
// The side padding of the quick-glance panels, which the person's card uses
// to line itself up with the Numbers tiles.
const PANEL_PAD = "clamp(14px, 1.6vw, 20px)";

export function ProfilePage({ view: v }: { view: PublicProfileView }) {
  const bannerArt = v.banner ?? v.favorites[0]?.backdrop ?? v.diary[0]?.backdrop ?? null;

  return (
    <main className={`w-full ${GUTTER} pt-[clamp(12px,2.2vw,32px)] pb-20`}>
      {v.previewNote && (
        <div className="mb-3 rounded-full border border-hair bg-card px-4 py-2 text-[12.5px] text-dim text-center">{v.previewNote}</div>
      )}

      <Banner v={v} art={bannerArt} />

      {/* The two columns end on the same line: the grid stretches both to
          the taller, the left's last row of panels grows to fill, and the
          Favourites card spaces its rows out. */}
      <div className="grid gap-5 mt-5 lg:grid-cols-2 items-stretch">
        <div className="flex flex-col gap-4">
          <ProfileCard v={v} />
          <Dashboard v={v} />
        </div>
        <FavouriteCard v={v} />
      </div>

      <ProfileTabs />

      <Section id="diary" title="Diary" count={v.diary.length} empty="Nothing logged yet." first>
        {v.diary.length > 0 && <DiaryTable entries={v.diary} />}
      </Section>

      <Section id="reviews" title="Reviews" count={v.reviews.length} empty="No reviews yet.">
        {v.reviews.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {v.reviews.map((r) => (
              <ReviewCard key={r.key} r={r} />
            ))}
          </div>
        )}
      </Section>

      <Section id="lists" title="Lists" count={v.lists.length} empty="No lists yet.">
        {v.lists.length > 0 && (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
            {v.lists.map((l) => (
              <ListCard key={l.id} l={l} />
            ))}
          </div>
        )}
      </Section>

      <Section id="favourites" title="Favourites" count={v.favorites.length} empty="No favourites yet.">
        {v.favorites.length > 0 && (
          <div className="grid gap-3 grid-cols-3 sm:grid-cols-5 lg:grid-cols-8">
            {v.favorites.map((t) => (
              <PosterLink key={t.key} t={t} />
            ))}
          </div>
        )}
      </Section>
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

// The section tabs, under the quick-glance panels and above the Diary, as a pill like the reference's nav: the lit tab a solid ink
// pill, the rest plain. On the page's own colours, so it follows Day and
// Night. Scrolls sideways on a phone rather than wrapping.
function ProfileTabs() {
  const tabs: [string, string][] = [
    ["#top", "Profile"],
    ["#diary", "Diary"],
    ["#reviews", "Reviews"],
    ["#lists", "Lists"],
    ["#favourites", "Favourites"],
  ];
  return (
    <nav
      aria-label="Profile sections"
      className="mt-10 inline-flex max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden items-center gap-1 p-1 rounded-full bg-card border border-hair"
    >
      {tabs.map(([href, label], i) => (
        <a
          key={href}
          href={href}
          className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-semibold no-underline transition-colors ${i === 0 ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

// The quick-glance panels under the person's card: the numbers, how they
// rate beside what they watch most, and a year of watching. The middle row
// grows to take up any slack, so the column ends level with Favourites.
function Dashboard({ v }: { v: PublicProfileView }) {
  return (
    <>
      <Panel title="Numbers">
        <NumberTiles v={v} />
      </Panel>
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
    <div className="grid grid-cols-4 gap-2">
      {tiles.map(([label, value]) => (
        <div key={label} className="rounded-[14px] bg-card-hi py-2.5 text-center">
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
// The person's card: handle and what they have put here, followers on the
// right. It starts where the Numbers panel's second tile starts, so it sits
// beside the photo hanging from the banner instead of running under it, and
// its left edge lines up with a line already on the page. The margin is the
// tile grid's own arithmetic: the panel's padding, one tile (a quarter of
// what is left after the padding and three 8px gaps), and one gap. On a
// phone, where a tile is narrower than the photo, it is the photo's edge
// instead, so the two never overlap.
function ProfileCard({ v }: { v: PublicProfileView }) {
  return (
    <div className="relative">
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
      className="rounded-[24px] bg-card border border-hair px-[clamp(14px,1.6vw,20px)] py-3 flex flex-col gap-2"
      style={{ marginLeft: `max(calc(${PANEL_PAD} + (100% - 2 * ${PANEL_PAD} - 24px) / 4 + 8px), calc(${AVATAR_LEFT} + ${AVATAR} + 12px))` }}
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
    <div className="rounded-[24px] bg-card border border-hair p-4 flex flex-col justify-between gap-4">
      <h2 className="!text-[clamp(26px,2.4vw,34px)] leading-none">Favourites</h2>
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

function Section({ id, title, count, empty, first = false, children }: { id: string; title: string; count: number; empty: string; first?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`${first ? "mt-6" : "mt-14"} scroll-mt-24`}>
      <div className="flex items-baseline gap-3 border-b border-hair pb-2 mb-5">
        <h2 className="!text-[clamp(30px,3vw,44px)]">{title}</h2>
        <span className="text-[13px] text-dim">{count}</span>
      </div>
      {count === 0 ? <p className="text-sm text-dim m-0">{empty}</p> : children}
    </section>
  );
}

function DiaryTable({ entries }: { entries: DiaryEntry[] }) {
  // Grouped by month, the way a diary reads.
  const months = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const m = e.date.slice(0, 7);
    months.set(m, [...(months.get(m) ?? []), e]);
  }
  return (
    <div className="grid gap-8">
      {[...months.entries()].map(([month, list]) => (
        <div key={month} className="grid gap-2 md:grid-cols-[140px_1fr]">
          <div className="display text-[26px] leading-none text-dim">{monthLabel(month)}</div>
          <ul className="m-0 p-0 list-none">
            {list.map((e, i) => (
              <li key={`${e.key}${e.date}`} className={i > 0 ? "border-t border-hair" : ""}>
                <Link href={e.href} className="flex items-center gap-4 py-2.5 no-underline text-ink hover:text-accent">
                  <span className="w-8 text-right display text-[22px] text-dim shrink-0">{Number(e.date.slice(8, 10))}</span>
                  <span className="w-9 shrink-0">
                    {e.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.poster} alt="" className="w-9 aspect-[2/3] rounded-[4px] object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-[14.5px]">
                    {e.title} <span className="text-dim font-normal">{e.year}</span>
                  </span>
                  {e.episodes && <span className="text-[12.5px] text-dim shrink-0">{e.episodes}</span>}
                  <span className="w-16 text-right shrink-0">{e.rating != null && <Rating value={e.rating} />}</span>
                  <span className="w-4 shrink-0 text-loved">{e.loved ? "♥" : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
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

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}
