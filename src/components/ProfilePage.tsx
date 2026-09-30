import Link from "next/link";
import type { LikedItem, ProfileTitle, PublicProfileView } from "@/lib/public-profile";
import { nightTokens } from "@/lib/theme";
import { FollowPill } from "./FollowPill";
import { FollowList } from "./FollowList";
import { WatchingNow } from "./WatchingNow";
import { ViewingAsOthers } from "./ViewingAsOthers";
import { ProfileCategories } from "./ProfileCategories";
import { ProfileAbout } from "./ProfileAbout";
import { ProfileMenu } from "./ProfileMenu";
import { ActivityFeed, type ActivityItem } from "./ActivityFeed";
import { ReviewCard } from "./ReviewCard";
import { BackToTop, ProfileSections } from "./ProfileNav";
import { ProfileDiary } from "./ProfileDiary";
import { FavouritesCard } from "./FavouritesCard";
import { MonthCalendar } from "./MonthCalendar";
import { MiniTracker } from "./MiniTracker";
import { AdSlot } from "./AdSlot";
import { ProfilePictures } from "./ProfilePictures";

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

      <ViewingAsOthers />
      <Banner v={v} art={bannerArt} />

      {/* Two columns on one grid, so their edges line up down the page. On
          top, the person's card beside the numbers. Under them, the wider
          left holds the tabbed sections (Reviews, Watching, Activity, Watchlog,
          Categories, Stats), and the narrower right the Tracker, level with
          the sections' shell rather than their tabs (ProfileSections lays the
          two out on the same column widths). The Tracker is as tall as the
          sections' shell, so both end on one line; its list scrolls inside. On a phone it all stacks: card, numbers, Tracker, then the
          sections.

          Favourites is parked while this layout is tried; it comes back
          somewhere else (FavouriteCard below is kept for that). */}
      <div className="grid gap-2 mt-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <ProfileCard v={v} />
        <div className="rounded-shell bg-card border border-hair p-2 flex self-stretch">
          <NumberTiles v={v} />
        </div>
          <ProfileSections
            owner={!!v.owner}
            privateProfile={!!v.isPrivate && !v.owner}
            hiddenSections={v.owner ? [] : (v.hiddenSections ?? [])}
            className="lg:col-span-2"
            aside={<MiniTracker shows={v.tracker.shows} films={v.tracker.films} owner={!!v.owner} />}
            sections={[
              {
                id: "reviews",
                label: "Reviews",
                count: v.reviews.length,
                content:
                  v.reviews.length > 0 ? (
                    <div className="grid gap-2">
                      {v.reviews.map((r) => (
                        <ReviewCard key={r.key} r={r} username={v.username} avatar={v.avatar} owner={v.viewerFollow === "self"} />
                      ))}
                    </div>
                  ) : (
                    <Empty>No reviews yet.</Empty>
                  ),
              },
              {
                id: "watching",
                label: "Watching",
                count: v.watching?.length ?? 0,
                content: v.watching?.length ? <WatchingNow shows={v.watching} /> : <Empty>Not in the middle of any series.</Empty>,
              },
              {
                // What they watched and reviewed lately, then the reviews and
                // lists they've liked (its own tab until 30 Sep, folded in to
                // keep the tabs to seven).
                id: "activity",
                label: "Activity",
                content: (
                  <div className="grid gap-4">
                    <ActivityList v={v} />
                    {v.liked && v.liked.length > 0 && (
                      <div className="grid gap-2">
                        <div className="px-1 text-[10.5px] font-bold uppercase tracking-[.12em] text-dim">Liked</div>
                        <LikedGrid items={v.liked} />
                      </div>
                    )}
                  </div>
                ),
              },
              {
                // Called the Watchlog rather than a diary, which is Letterboxd's word.
                id: "watchlog",
                label: "Watchlog",
                count: v.diary.length,
                content: v.diary.length > 0 ? <ProfileDiary entries={v.diary} owner={!!v.owner} username={v.username} avatar={v.avatar} /> : <Empty>Nothing logged yet.</Empty>,
              },
              {
                id: "watchlist",
                label: "Watchlist",
                count: v.watchlist?.length ?? 0,
                content: v.watchlist?.length ? <PosterGrid titles={v.watchlist} /> : <Empty>Nothing on the watchlist.</Empty>,
              },
              {
                // The app's profile grid: its eight built-in categories, then the
                // person's own lists.
                id: "categories",
                label: "Categories",
                count: v.categories.length,
                content: v.categories.length > 0 ? <ProfileCategories categories={v.categories} owner={!!v.owner} username={v.username} library={v.owner ? [...v.owner.shows, ...v.owner.films] : []} accountPrivacy={v.categoryPrivacy} live={v.viewerFollow === "self"} /> : <Empty>Nothing in any category yet.</Empty>,
              },
              // No Favourites tab: the loved titles are the Favorites category.
              { id: "stats", label: "Stats", content: <Dashboard v={v} /> },
            ]}
          />
      </div>

      <AdSlot place="profile" className="mt-8" />

      <BackToTop />
    </main>
  );
}

function Banner({ v, art }: { v: PublicProfileView; art: string | null }) {
  return (
    <section id="top" className="relative scroll-mt-24">
      <div
        className="relative overflow-hidden h-[clamp(420px,40vw,540px)]"
        style={{ borderRadius: "var(--shell-radius)", ...nightTokens }}
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
        {/* The owner changes the photo and banner from the banner itself. */}
        {v.viewerFollow === "self" && v.owner && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
            <ProfilePictures library={[...v.owner.shows, ...v.owner.films]} avatar={v.avatar} banner={v.banner ?? null} />
          </div>
        )}
      </div>


    </section>
  );
}

// The Stats tab: how they rate, what they watch most, and a month of
// watching, three in a row.
function Dashboard({ v }: { v: PublicProfileView }) {
  const year = new Date().getFullYear();
  return (
    <div className="grid gap-2">
    {/* The year so far, as its own page made for sharing (the owner's own
        library, until accounts). */}
    {v.owner && (
      <div className="grid gap-2 sm:grid-cols-2">
        <Link href={`/u/${v.username}/year/${year}`} className="rounded-shell bg-accent-fill text-on-accent p-3 flex items-center justify-between no-underline hover:brightness-110">
          <span className="text-[12.5px] font-semibold">Your {year} in review</span>
          <span aria-hidden>→</span>
        </Link>
        {/* Every number, on the Stats page (Pro). */}
        <Link href="/stats" className="rounded-shell bg-card-hi text-ink p-3 flex items-center justify-between no-underline hover:text-accent">
          <span className="text-[12.5px] font-semibold">See all your stats</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    )}
    <div className="grid gap-2 sm:grid-cols-3">
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
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-shell bg-piece p-3 flex flex-col min-w-0">
      <div className="text-[10.5px] font-bold tracking-[.12em] uppercase text-dim mb-2">{title}</div>
      {children}
    </div>
  );
}

function NumberTiles({ v }: { v: PublicProfileView }) {
  const s = v.stats;
  const tiles: [string, string | number][] = [
    ["Movies", s.films.toLocaleString("en")],
    ["Shows", s.shows.toLocaleString("en")],
    ["Episodes", s.episodes.toLocaleString("en")],
    // The social counts sit with the rest of the numbers, last, as
    // Letterboxd sets them.
    ["Followers", v.followers.toLocaleString("en")],
    ["Following", v.following.toLocaleString("en")],
  ];
  return (
    // One row of five, as tall as the person's card beside it.
    <div className="flex-1 grid grid-cols-5 gap-1.5">
      {tiles.map(([label, value]) => (
        // 2px more above than below: Bebas keeps room under its figures, so
        // this is what centres the lettering itself in the tile.
        // The labels are set at 10px and scaled down to fit, rather than set
        // tiny: a browser with a minimum font size (a common reading setting)
        // enlarges small type but leaves a scale alone, so FOLLOWERS still
        // fits its tile.
        label === "Followers" || label === "Following" ? (
          // Pressed, the people (FollowList).
          <FollowList key={label} kind={label === "Followers" ? "followers" : "following"} owner={!!v.owner} username={v.viewerFollow !== undefined ? v.username : undefined} className={TILE}>
            <Tile label={label} value={value} />
          </FollowList>
        ) : (
          <div key={label} className={TILE}>
            <Tile label={label} value={value} />
          </div>
        )
      ))}
    </div>
  );
}

const TILE = "min-w-0 rounded-shell bg-card-hi pt-2 pb-1.5 px-1 text-center flex flex-col items-center justify-center";

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <div className="display text-[21px] xl:text-[23px] leading-none text-accent">{value}</div>
      <div className="text-[10px] leading-none font-bold tracking-[.04em] uppercase text-dim mt-0.5 whitespace-nowrap scale-[.54] xl:scale-[.72]">{label}</div>
    </>
  );
}

function RatingsSpread({ values }: { values: number[] }) {
  const buckets = Array.from({ length: 10 }, (_, i) => values.filter((x) => Math.ceil(x) === i + 1).length);
  const most = Math.max(1, ...buckets);
  const avg = values.length ? values.reduce((x, y) => x + y, 0) / values.length : null;
  return (
    <div className="flex-1 flex flex-col">
      <div className="text-[12.5px] mb-2">
        <b className="text-ink">{values.length}</b> <span className="text-dim">ratings{avg != null ? ` · avg ${avg.toFixed(1)}` : ""}</span>
      </div>
      <div className="flex items-end gap-[3px] h-[64px]">
        {buckets.map((n, i) => (
          <div key={i} title={`${i + 1}: ${n}`} className="flex-1 rounded-t-[3px] bg-accent-fill" style={{ height: `${Math.max(4, (n / most) * 100)}%`, opacity: n ? 1 : 0.18 }} />
        ))}
      </div>
      <div className="flex justify-between text-[10.5px] text-dim mt-1.5">
        <span>★ 1</span>
        <span>★ 10</span>
      </div>
    </div>
  );
}

function TopGenres({ genres }: { genres: { name: string; share: number }[] }) {
  if (genres.length === 0) return <p className="m-0 text-[12.5px] text-dim">Nothing tracked yet.</p>;
  const most = Math.max(...genres.map((g) => g.share));
  return (
    <ul className="m-0 p-0 list-none grid gap-[7px]">
      {genres.map((g) => (
        <li key={g.name} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_30px] items-center gap-1.5 text-[12.5px]">
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

// The person's card, beside the photo hanging from the banner. On the left,
// the handle, then where they are and a line in their own words (both theirs
// to set, and only there when set); on the right, Follow.
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
        // The card starts at the column's left edge, level with the tabs
        // below it, and on a wide screen is exactly as wide as the tab bar
        // (--tabs-w, set by the bar); the photo sits over its left end, and
        // the writing starts past the photo.
        className="flex-1 lg:flex-none lg:w-[var(--tabs-w,100%)] rounded-shell bg-card border border-hair pr-3 py-3 min-w-0"
        style={{ paddingLeft: `calc(${AVATAR_LEFT} + ${AVATAR} + 16px)` }}
      >
        <div className="flex items-start gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="display text-[clamp(20px,1.8vw,26px)] leading-[.9] truncate">@{v.username}</div>
        </div>
        {/* Follow, its top level with the top of the handle (a pixel down, to
            where the capitals start; FollowPill sizes itself to the handle's
            line). The follower counts are with the numbers beside the card. */}
        <div className="shrink-0 mt-px flex items-start gap-2">
          {(v.owner || v.allowFollows !== false) && <FollowPill owner={!!v.owner} username={v.username} state={v.viewerFollow} />}
          <ProfileMenu username={v.username} owner={!!v.owner} />
        </div>
        </div>
        {/* Under the handle and Follow, across the card's full width, so the
            quote has the whole line to run on. */}
        <ProfileAbout location={v.location} quote={v.bio} owner={!!v.owner} username={v.username} />
      </div>
    </div>
  );
}

// The Favourites card (FavouritesCard): top films and series, editable by
// the owner, and the five most recent watches worked out from the diary.
// Parked: not on the page while the sections-beside-tracker layout is tried.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FavouriteCard({ v }: { v: PublicProfileView }) {
  const recent: ProfileTitle[] = [];
  for (const e of v.diary) {
    if (recent.length === 5) break;
    if (!recent.some((r) => r.key === e.key)) recent.push(e);
  }
  return <FavouritesCard username={v.username} autoFilms={v.topFilms} autoShows={v.topShows} recent={recent} owner={v.owner} />;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 rounded-shell bg-piece p-3 text-[12.5px] text-dim">{children}</p>;
}

// What they have been doing lately, newest first: watches from the diary
// (with the rating and heart they gave), and reviews they wrote, as one
// timeline of short sentences.
function ActivityList({ v }: { v: PublicProfileView }) {
  const items: ActivityItem[] = [
    ...v.diary.map((e): ActivityItem => ({
      key: `w${e.key}${e.date}`,
      date: e.date,
      t: e,
      verb: e.rewatch ? "Rewatched" : "Watched",
      detail: e.episodes,
      rating: e.rating,
      loved: e.loved,
    })),
    ...v.reviews.filter((r) => r.date).map((r): ActivityItem => ({ key: `r${r.key}`, date: r.date!, t: r, verb: "Reviewed", rating: r.rating })),
  ]
    .sort((x, y) => y.date.localeCompare(x.date))
    .slice(0, 10);
  return <ActivityFeed items={items} />;
}

// One review, laid out after the way Letterboxd shows reviews on a profile:
// the poster on the left, then who watched what and when, the title, the
// marks, the review in readable paragraphs, and like / comment / share under
// it. A review of a single episode says which one, which a films-only site
// has no way to do. Spoilers stay hidden behind a tap.

// A run of posters, each to its title: the Watchlist tab.
function PosterGrid({ titles }: { titles: ProfileTitle[] }) {
  return (
    <ol className="m-0 p-0 list-none grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
      {titles.map((t) => (
        <li key={t.key} className="min-w-0">
          <Link href={t.href} className="group block no-underline text-ink">
            <span className="block aspect-[2/3] rounded-[10px] overflow-hidden bg-card border border-hair group-hover:border-accent transition-colors">
              {t.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
              )}
            </span>
            <span className="block mt-1.5 text-[12.5px] leading-[16px] truncate group-hover:text-accent transition-colors">{t.title}</span>
            <span className="block text-[12.5px] leading-[16px] text-dim">
              {t.year}
              {t.kind === "show" && " · Series"}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

// Under Activity: reviews and lists they've liked, each to its page.
function LikedGrid({ items }: { items: LikedItem[] }) {
  return (
    <ol className="m-0 p-0 list-none grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
      {items.map((t) => (
        <li key={t.key} className="min-w-0">
          <Link href={t.href} className="group block no-underline text-ink">
            <span className="block aspect-[2/3] rounded-[10px] overflow-hidden bg-card border border-hair group-hover:border-accent transition-colors">
              {t.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
              )}
            </span>
            <span className="block mt-1.5 text-[12.5px] leading-[16px] truncate group-hover:text-accent transition-colors">{t.title}</span>
            <span className="block text-[12.5px] leading-[16px] text-dim truncate">
              {t.kind === "review" ? "Review" : "List"} by @{t.owner}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
