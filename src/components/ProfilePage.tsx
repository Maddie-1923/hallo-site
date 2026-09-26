import Link from "next/link";
import type { DiaryEntry, ListEntry, NowWatching, ProfileTitle, PublicProfileView, ReviewEntry } from "@/lib/public-profile";
import { nightTokens } from "@/lib/theme";

// A public profile, laid out as a bento board after the reference the user
// chose: one big rounded banner left to its picture, pill tabs under it, then
// the person's card and their favourites side by side. The full diary,
// reviews, lists and favourites follow below, and the tabs jump to them.
//
// Server-rendered and read-only. Following is drawn but not live until the
// accounts side opens.

const GUTTER = "px-[clamp(16px,3.2vw,64px)]";
// The banner's corner radius.
const R = 28;

export function ProfilePage({ view: v }: { view: PublicProfileView }) {
  const bannerArt = v.banner ?? v.favorites[0]?.backdrop ?? v.diary[0]?.backdrop ?? null;

  return (
    <main className={`w-full ${GUTTER} pt-[clamp(12px,2.2vw,32px)] pb-20`}>
      {v.previewNote && (
        <div className="mb-3 rounded-full border border-hair bg-card px-4 py-2 text-[12.5px] text-dim text-center">{v.previewNote}</div>
      )}

      <Banner v={v} art={bannerArt} />

      <ProfileTabs />

      <div className="grid gap-5 mt-4 lg:grid-cols-2 items-start">
        <ProfileCard v={v} />
        <FavouriteCard v={v} />
      </div>

      <Section id="diary" title="Diary" count={v.diary.length} empty="Nothing logged yet.">
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
        {/* Nothing is written on the picture any more, so it is left as it is
            but for a faint shade at the top behind the Follow button. */}
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(12,10,9,.3) 0%, transparent 25%)" }} />

        {/* Follow, top right. Drawn now, live when accounts open. */}
        <button
          type="button"
          disabled
          title="Following opens with Kodigo accounts on the web"
          className="absolute top-4 right-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F4F1EA]/92 backdrop-blur text-[#1a1a19] text-[13px] font-semibold shadow-sm cursor-default"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <circle cx="10" cy="8" r="4" />
            <path d="M3 21c0-4 3.1-7 7-7s7 3 7 7M19 8v6M16 11h6" />
          </svg>
          Follow
        </button>

        {/* No name across the picture: the handle on the card is who this
            is. The page's heading is still the handle, for screen readers
            and search. */}
        <h1 className="sr-only">@{v.username}</h1>
      </div>

    </section>
  );
}

// The section tabs, under the banner and above the person's card, as a pill like the reference's nav: the lit tab a solid ink
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
      className="mt-5 inline-flex max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden items-center gap-1 p-1 rounded-full bg-card border border-hair"
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

function ProfileCard({ v }: { v: PublicProfileView }) {
  const initial = (v.displayName[0] ?? "?").toUpperCase();
  return (
    <div className="rounded-[24px] bg-card border border-hair p-[clamp(16px,1.8vw,24px)] flex flex-col gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-[clamp(48px,4.6vw,64px)] aspect-square rounded-full overflow-hidden bg-accent-fill text-on-accent flex items-center justify-center display text-3xl shrink-0 border-2 border-page shadow">
          {v.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        {/* The handle is who this is; under it, what the person has put
            here, and what they say about themselves. */}
        <div className="min-w-0">
          <div className="display text-[clamp(20px,1.9vw,28px)] leading-[.9] truncate">@{v.username}</div>
          <div className="text-[12px] text-dim">
            {v.stats.ratings} ratings · {v.reviews.length} reviews · {v.lists.length} lists
          </div>
        </div>
      </div>
      {/* What they have watched, in the display face: the card's headline
          figure, under the handle and above who follows them. */}
      <div className="display text-[clamp(22px,2vw,30px)] leading-none text-ink">
        {v.stats.films} films · {v.stats.episodes} episodes
      </div>
      {v.bio && <p className="m-0 text-[13px] leading-[1.45] text-dim line-clamp-3">{v.bio}</p>}
      <div className="flex items-center gap-5 text-[13px]">
        <span>
          <b className="text-ink">{v.followers}</b> <span className="text-dim">followers</span>
        </span>
        <span>
          <b className="text-ink">{v.following}</b> <span className="text-dim">following</span>
        </span>
      </div>
    </div>
  );
}

// The Favourites card in three parts: what they are watching right now, big,
// with how far along they are; then their top five films and top five series
// as rows of posters. An empty slot in a row is drawn as an outline so the
// row keeps its shape while it fills up.
function FavouriteCard({ v }: { v: PublicProfileView }) {
  return (
    <div className="rounded-[24px] bg-card border border-hair p-4 flex flex-col gap-4">
      <h2 className="!text-[clamp(26px,2.4vw,34px)] leading-none">Favourites</h2>

      <div>
        <Label>Now watching</Label>
        {v.nowWatching ? <NowWatchingCard n={v.nowWatching} /> : <div className="rounded-[18px] aspect-video bg-card-hi flex items-center justify-center text-sm text-dim">Not in the middle of anything</div>}
      </div>

      <div>
        <Label>Top 5 films</Label>
        <FiveRow titles={v.topFilms} />
      </div>

      <div>
        <Label>Top 5 series</Label>
        <FiveRow titles={v.topShows} />
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold tracking-[.14em] uppercase text-dim mb-2">{children}</div>;
}

function NowWatchingCard({ n }: { n: NowWatching }) {
  const share = n.aired ? Math.min(1, n.watched / n.aired) : null;
  return (
    <Link href={n.href} className="group relative block rounded-[18px] overflow-hidden aspect-video bg-card-hi no-underline" style={nightTokens}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {n.backdrop && <img src={n.backdrop} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <span className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#F4F1EA] text-[#1a1a19] flex items-center justify-center" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17L17 7M9 7h8v8" />
        </svg>
      </span>
      <div className="absolute left-4 right-4 bottom-3.5">
        <div className="display text-white text-[clamp(24px,2.2vw,32px)] leading-[.9]">{n.title}</div>
        <div className="text-[12.5px] text-white/85 mt-1.5 flex flex-wrap gap-x-2">
          <span>Last seen {n.lastSeen}</span>
          {n.next ? <span>· Up next {n.next}</span> : n.aired ? <span>· All caught up</span> : null}
        </div>
        {/* How far through what has aired, as a bar in the theme colour. */}
        {share != null && (
          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="flex-1 h-[5px] rounded-full bg-white/25 overflow-hidden">
              <div className="h-full rounded-full bg-accent-fill" style={{ width: `${Math.round(share * 100)}%` }} />
            </div>
            <span className="text-[11.5px] text-white/85 whitespace-nowrap">
              {n.watched} of {n.aired}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
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

function Section({ id, title, count, empty, children }: { id: string; title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-24">
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
