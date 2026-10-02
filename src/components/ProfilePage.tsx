import Link from "next/link";
import type { LikedItem, ProfileTitle, PublicProfileView } from "@/lib/public-profile";
import { nightTokens } from "@/lib/theme";
import { FollowPill } from "./FollowPill";
import { FollowList } from "./FollowList";
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
// Fixed sizes, as on the rest of the site: nothing on the page grows with
// the window, which only moves the margins once the page is at its widest.
// The photo hangs from the banner over the card's top edge; its size is a
// variable set on the card, a little smaller on a phone so the name beside
// it has room.
const AVATAR = "var(--avatar)";
const AVATAR_LEFT = "2.3333rem";

export function ProfilePage({ view: v }: { view: PublicProfileView }) {
  // Their chosen banner; until they choose one, the still of a favourite, of
  // what they rate highest, or of what they watched last. A profile with none
  // of those draws a short gradient rather than a big empty one.
  const bannerArt = v.banner ?? latestStill(v);

  return (
    <main className={`w-full ${GUTTER} pt-[clamp(12px,2.2vw,32px)] pb-20`}>
      <div className="max-w-[86.6667rem] mx-auto">
      {v.previewNote && (
        <div className="mb-3 rounded-full border border-hair bg-card px-4 py-2 text-[1.0417rem] text-dim text-center">{v.previewNote}</div>
      )}

      <ViewingAsOthers />
      <Banner v={v} art={bannerArt} />

      {/* On top, the person's card beside the numbers. Under them, their
          Favourites in a narrow column on the left and the tabbed sections
          (Reviews, Activity, Watchlog, Watchlist, Categories, Stats) on the wider right (ProfileSections lays the two out). On a
          phone it all stacks: card, numbers, Favourites, then the sections. */}
      <div className="grid gap-2 mt-3 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <ProfileCard v={v} />
        <div className="rounded-shell bg-card border border-hair p-2 flex self-stretch">
          <NumberTiles v={v} />
        </div>
          <ProfileSections
            owner={!!v.owner}
            privateProfile={!!v.isPrivate && !v.owner}
            hiddenSections={v.owner ? [] : (v.hiddenSections ?? [])}
            className="lg:col-span-2"
            // Left of the sections, their favourites (a tracker is the owner's
            // own to-do).
            aside={<FavouriteCard v={v} />}
            sections={[
              {
                id: "reviews",
                label: "Reviews",
                count: v.reviews.length,
                content:
                  v.reviews.length > 0 ? (
                    <div className="grid gap-2">
                      {v.reviews.map((r) => (
                        <ReviewCard key={r.key} r={r} username={v.username} avatar={v.avatar} owner={v.viewerFollow === "self"} onProfile />
                      ))}
                    </div>
                  ) : (
                    <Empty>No reviews yet.</Empty>
                  ),
              },
              {
                // What they watched and reviewed lately, then the reviews and
                // lists they've liked (its own tab until 30 Sep, folded in to
                // keep the tabs few).
                id: "activity",
                label: "Activity",
                content: (
                  <div className="grid gap-4">
                    <ActivityList v={v} />
                    {v.liked && v.liked.length > 0 && (
                      <div className="grid gap-2">
                        <div className="px-1 text-[0.875rem] font-bold uppercase tracking-[.12em] text-dim">Liked</div>
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
      </div>
    </main>
  );
}

/** The banner when none is chosen: the still of a favourite, of what they
    rate highest, or of what they watched last. */
function latestStill(v: PublicProfileView) {
  return [...v.favorites, ...v.topFilms, ...v.topShows, ...v.diary].find((t) => t.backdrop)?.backdrop ?? null;
}

function Banner({ v, art }: { v: PublicProfileView; art: string | null }) {
  return (
    <section id="top" className="relative scroll-mt-24">
      <div
        className={`relative overflow-hidden ${art ? "h-[37.5rem] max-sm:h-[20rem]" : "h-[13.3333rem]"}`}
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
            <ProfilePictures library={[...v.owner.shows, ...v.owner.films]} avatar={v.avatar} banner={v.banner ?? null} latest={latestStill(v)} name={v.displayName} />
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
          <span className="text-[1.0417rem] font-semibold">Your {year} in review</span>
          <span aria-hidden>→</span>
        </Link>
        {/* Every number, on the Stats page (Pro). */}
        <Link href="/stats" className="rounded-shell bg-card-hi text-ink p-3 flex items-center justify-between no-underline hover:text-accent">
          <span className="text-[1.0417rem] font-semibold">See all your stats</span>
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
      <div className="text-[0.875rem] font-bold tracking-[.12em] uppercase text-dim mb-2">{title}</div>
      {children}
    </div>
  );
}

// Under the photo, in the space the card leaves beside it: a small box of
// four counts in two rows, followers and following (each opening the list of
// people), then lists and reviews (each opening its tab).
function PeopleCounts({ v }: { v: PublicProfileView }) {
  const cell = "block min-w-0 truncate text-left text-[0.9167rem] leading-[1.35] text-dim no-underline hover:text-ink hover:font-semibold cursor-pointer";
  const n = (x: number) => <b className="font-semibold text-ink">{x.toLocaleString("en")}</b>;
  const lists = v.categories.filter((c) => c.id.startsWith("list:")).length;
  const reviews = v.reviews.length;
  const who = v.viewerFollow !== undefined ? v.username : undefined;
  return (
    // From the column's left edge (the banner's and Favourites') to the card,
    // and from under the photo down to the card's foot. A phone has no room
    // there for two columns, so it's a row of four under the card instead.
    <div className="sm:absolute sm:left-0 sm:bottom-0 sm:top-[calc(var(--avatar)*0.5+0.5rem)] sm:w-[calc(var(--card-in)-0.5rem)] max-sm:order-2 max-sm:mt-2 rounded-shell bg-card border border-hair grid grid-cols-[auto_auto] max-sm:grid-cols-4 justify-center max-sm:justify-between content-center gap-x-4 gap-y-0.5 px-3 py-1.5 ![font-family:var(--font-body)]">
      <FollowList kind="followers" owner={!!v.owner} username={who} className={cell} plain>
        {n(v.followers)} {v.followers === 1 ? "follower" : "followers"}
      </FollowList>
      <FollowList kind="following" owner={!!v.owner} username={who} className={cell} plain>
        {n(v.following)} following
      </FollowList>
      <a href="#categories" className={cell}>
        {n(lists)} {lists === 1 ? "list" : "lists"}
      </a>
      <a href="#reviews" className={cell}>
        {n(reviews)} {reviews === 1 ? "review" : "reviews"}
      </a>
    </div>
  );
}

function NumberTiles({ v }: { v: PublicProfileView }) {
  const s = v.stats;
  const n = (x: number) => x.toLocaleString("en");
  const cols: [string, string, number, number | undefined][] = [
    ["Movies", "movies", s.films, s.year?.films],
    ["Shows", "shows", s.shows, s.year?.shows],
    ["Episodes", "episodes", s.episodes, s.year?.episodes],
  ];
  const dated = s.year != null;
  // Every column has the same rows, so the hairlines between them run
  // straight across the box: the heading, this year, all time.
  const rows = dated ? "grid-rows-[auto_1fr_1fr]" : "grid-rows-[auto_1fr]";
  const cell = "flex items-center justify-center px-2";
  const label = "text-[0.75rem] leading-none font-bold tracking-[.1em] uppercase whitespace-nowrap";
  return (
    // A small table, as tall as the person's card beside it: the three
    // counts across, this year's over all time's, hairlines between the
    // rows. Each column opens the page listing what it counts. The social
    // counts are under the photo (PeopleCounts).
    <div className="flex-1 flex min-w-0 py-1">
      {dated && (
        <div className={`grid ${rows} divide-y divide-hair`}>
          <div className={`${cell} justify-start py-2`} aria-hidden>
            <span className={`${label} invisible`}>Movies</span>
          </div>
          <div className={`${cell} justify-start`}>
            <span className={`${label} text-dim`}>This year</span>
          </div>
          <div className={`${cell} justify-start`}>
            <span className={`${label} text-dim`}>All time</span>
          </div>
        </div>
      )}
      {cols.map(([name, page, all, year]) => (
        <Link key={name} href={`/u/${v.username}/${page}`} className={`group flex-1 min-w-0 grid ${rows} divide-y divide-hair no-underline text-ink`}>
          <div className={`${cell} py-2`}>
            <span className={`${label} text-ink group-hover:text-accent transition-colors`}>{name}</span>
          </div>
          {dated && (
            <div className={cell}>
              <span className="display text-[2.1667rem] leading-none text-accent pt-[2px]">{n(year ?? 0)}</span>
            </div>
          )}
          <div className={cell}>
            <span className={`display leading-none pt-[2px] ${dated ? "text-[1.8333rem] text-ink" : "text-[2.3333rem] text-accent"}`}>{n(all)}</span>
          </div>
        </Link>
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
      <div className="text-[1.0417rem] mb-2">
        <b className="text-ink">{values.length}</b> <span className="text-dim">ratings{avg != null ? ` · avg ${avg.toFixed(1)}` : ""}</span>
      </div>
      <div className="flex items-end gap-[0.25rem] h-[5.3333rem]">
        {buckets.map((n, i) => (
          <div key={i} title={`${i + 1}: ${n}`} className="flex-1 rounded-t-[3px] bg-accent-fill" style={{ height: `${Math.max(4, (n / most) * 100)}%`, opacity: n ? 1 : 0.18 }} />
        ))}
      </div>
      <div className="flex justify-between text-[0.875rem] text-dim mt-1.5">
        <span>★ 1</span>
        <span>★ 10</span>
      </div>
    </div>
  );
}

function TopGenres({ genres }: { genres: { name: string; share: number }[] }) {
  if (genres.length === 0) return <p className="m-0 text-[1.0417rem] text-dim">Nothing tracked yet.</p>;
  const most = Math.max(...genres.map((g) => g.share));
  return (
    <ul className="m-0 p-0 list-none grid gap-[0.5833rem]">
      {genres.map((g) => (
        <li key={g.name} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_30px] items-center gap-1.5 text-[1.0417rem]">
          <span className="truncate text-ink">{g.name}</span>
          <span className="h-[0.4167rem] rounded-full bg-card-hi overflow-hidden">
            <span className="block h-full rounded-full bg-accent-fill" style={{ width: `${(g.share / most) * 100}%` }} />
          </span>
          <span className="text-right text-dim">{Math.round(g.share * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}

// The person's card, beside the photo hanging from the banner, always as
// tall as the numbers beside it (the quote is three lines at most, so the
// card never needs to be taller). On the left,
// the handle, then where they are and a line in their own words (both theirs
// to set, and only there when set); on the right, Follow.
function ProfileCard({ v }: { v: PublicProfileView }) {
  return (
    <div className="relative flex max-sm:flex-col self-stretch [--avatar:10.6667rem] max-sm:[--avatar:7.5rem] [--card-in:calc(2.3333rem+var(--avatar)+0.5rem)]">
      {/* The photo, as the app draws it: a circle in a ring of the page's own
          colour, crossing the banner's bottom edge so the ring reads as the
          banner being interrupted by the person in front of it. Anchored to
          the card rather than the banner, so its foot sits on the card's
          bottom line whatever the card holds. */}
      <div
        className="absolute z-10 rounded-full overflow-hidden bg-accent-fill text-on-accent flex items-center justify-center display shadow-[0_0_0_4px_var(--page),0_10px_28px_rgba(0,0,0,.45)]"
        style={{ width: AVATAR, height: AVATAR, left: AVATAR_LEFT, top: `calc(${AVATAR} * -0.5)`, fontSize: `calc(${AVATAR} * 0.45)` }}
      >
        {v.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          (v.displayName[0] ?? "?").toUpperCase()
        )}
      </div>
      <PeopleCounts v={v} />
      <div
        // The card starts past the photo, so the photo stands on its own
        // hanging from the banner with no shell under it, and runs to the
        // numbers beside it.
        className="flex-1 rounded-shell bg-card border border-hair px-4 py-3 min-w-0"
        // At least as tall as the photo's lower half and the people box
        // under it, so neither drops below the card's foot.
        style={{ marginLeft: "var(--card-in)", minHeight: `calc(${AVATAR} * 0.5 + 4.75rem)` }}
      >
        <div className="flex items-start gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          {/* Their name in the display face with the handle beside it, the two
              sitting on one baseline; just the handle, in lowercase as it's
              typed, until they set a name. */}
          {v.displayName && v.displayName !== v.username ? (
            // On a phone there's no room for both on a line: the handle goes under.
            <div className="flex max-sm:flex-col items-baseline max-sm:items-start gap-x-2 gap-y-1 min-w-0">
              <div className="display text-[2.1667rem] leading-[.9] truncate shrink-0 sm:max-w-[70%] max-w-full">{v.displayName}</div>
              <div className="text-[1.0417rem] text-dim truncate min-w-0">@{v.username}</div>
            </div>
          ) : (
            <div className="text-[1.6667rem] font-semibold leading-tight truncate">@{v.username}</div>
          )}
        </div>
        {/* Follow, then the profile's menu, at the card's top right. */}
        <div className="shrink-0 mt-px flex items-start gap-2">
          {(v.owner || v.allowFollows !== false) && <FollowPill owner={!!v.owner} username={v.username} state={v.viewerFollow} />}
          <ProfileMenu username={v.username} owner={!!v.owner} />
        </div>
        </div>
        {/* Under the handle and Follow, across the card's full width, so the
            quote has the whole line to run on. */}
        <ProfileAbout location={v.location} quote={v.bio} links={v.links} owner={!!v.owner} username={v.username} />
      </div>
    </div>
  );
}

// The Favourites card (FavouritesCard): top films and shows, editable by the
// owner.
function FavouriteCard({ v }: { v: PublicProfileView }) {
  return <FavouritesCard username={v.username} autoFilms={v.topFilms} autoShows={v.topShows} owner={v.owner} />;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 rounded-shell bg-piece p-3 text-[1.0417rem] text-dim">{children}</p>;
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
            <span className="block mt-1.5 text-[1.0417rem] leading-[1.3333rem] truncate group-hover:text-accent transition-colors">{t.title}</span>
            <span className="block text-[1.0417rem] leading-[1.3333rem] text-dim">
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
            <span className="block mt-1.5 text-[1.0417rem] leading-[1.3333rem] truncate group-hover:text-accent transition-colors">{t.title}</span>
            <span className="block text-[1.0417rem] leading-[1.3333rem] text-dim truncate">
              {t.kind === "review" ? "Review" : "List"} by @{t.owner}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
