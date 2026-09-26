import Link from "next/link";
import type { DiaryEntry, ListEntry, ProfileTitle, PublicProfileView, ReviewEntry } from "@/lib/public-profile";
import { nightTokens } from "@/lib/theme";

// A public profile, laid out as a bento board after the reference the user
// chose: one big rounded banner with the name set huge across it, a corner of
// the banner cut away to hold the person's card, pill tabs over the picture,
// and a row of cards under it — favourites, a headline block with the
// numbers, and the latest diary entries in a divided list. The full diary,
// reviews, lists and favourites follow below, and the tabs jump to them.
//
// Server-rendered and read-only. Following is drawn but not live until the
// accounts side opens.

const GUTTER = "px-[clamp(16px,3.2vw,64px)]";
// The banner's corner radius, and the cut-out corner's, so the concave joins
// meet the curves they continue.
const R = 28;

export function ProfilePage({ view: v }: { view: PublicProfileView }) {
  const bannerArt = v.banner ?? v.favorites[0]?.backdrop ?? v.diary[0]?.backdrop ?? null;
  const lead = v.favorites[0] ?? null;

  return (
    <main className={`w-full ${GUTTER} pt-[clamp(12px,2.2vw,32px)] pb-20`}>
      {v.previewNote && (
        <div className="mb-3 rounded-full border border-hair bg-card px-4 py-2 text-[12.5px] text-dim text-center">{v.previewNote}</div>
      )}

      <Banner v={v} art={bannerArt} />

      <div className="grid gap-5 mt-5 lg:grid-cols-12">
        <FavouriteCard lead={lead} rest={v.favorites.slice(1, 5)} count={v.favorites.length} />
        <HeadlineBlock v={v} />
        <LatestList entries={v.diary.slice(0, 4)} />
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
  const tabs: [string, string][] = [
    ["#top", "Profile"],
    ["#diary", "Diary"],
    ["#reviews", "Reviews"],
    ["#lists", "Lists"],
    ["#favourites", "Favourites"],
  ];
  // Films and episodes, as the headline's second line: the page says what
  // this person watches before it says anything else.
  const line2 = `${v.stats.films} films · ${v.stats.episodes} episodes`;

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
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(12,10,9,.75) 0%, rgba(12,10,9,.25) 45%, rgba(12,10,9,.15) 100%)" }} />

        {/* The tabs, in a pale pill like the reference's, top left. */}
        <nav aria-label="Profile sections" className="absolute top-4 left-4 max-w-[calc(100%-130px)] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex items-center gap-1 p-1 rounded-full bg-[#F4F1EA]/92 backdrop-blur text-[#1a1a19] shadow-sm">
          {tabs.map(([href, label], i) => (
            <a
              key={href}
              href={href}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold no-underline transition-colors ${i === 0 ? "bg-[#1a1a19] text-[#F4F1EA]" : "text-[#1a1a19]/80 hover:text-[#1a1a19]"}`}
            >
              {label}
            </a>
          ))}
        </nav>

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

        {/* What they watch most, as chips on the right above the second
            headline line, like the reference's HOUSE / FARM / FACTORY. */}
        <div className="hidden md:block absolute right-6 top-[34%] max-w-[380px]">
          <div className="flex flex-wrap gap-2">
            {v.topGenres.map((g, i) => (
              <span
                key={g}
                className={`px-3.5 py-1.5 rounded-full text-[11.5px] font-bold uppercase tracking-[.06em] border ${i === 0 ? "bg-[#F4F1EA] text-[#1a1a19] border-[#F4F1EA]" : "border-white/70 text-white"}`}
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* The name, huge. Its first line crosses the picture above the
            cut-out corner; its second runs along the bottom to the right of
            it, the way the reference's headline breaks around its card. */}
        <h1
          className="absolute left-[clamp(20px,3vw,40px)] bottom-[clamp(84px,14vw,110px)] md:bottom-[calc(48%+6px)] max-w-[92%] !leading-[.85] text-white drop-shadow-[0_4px_30px_rgba(0,0,0,.45)] uppercase"
          style={{ fontSize: "clamp(48px, 7.4vw, 124px)" }}
        >
          {v.displayName}
        </h1>
        <p
          className="display absolute left-[clamp(20px,3vw,40px)] md:left-[calc(min(380px,36%)+clamp(16px,2vw,28px))] right-6 bottom-[clamp(16px,2.2vw,28px)] m-0 !leading-[.85] text-white uppercase drop-shadow-[0_4px_30px_rgba(0,0,0,.45)]"
          style={{ fontSize: "clamp(34px, 5.2vw, 88px)" }}
        >
          {line2}
        </p>
      </div>

      {/* The cut-out corner, in the page's colour, holding the person's card.
          The two small squares beside it are the concave joins: page colour
          outside a quarter circle, so the banner's edge curves into the cut
          the way it curves at its corners. */}
      <div className="hidden md:block absolute left-0 bottom-0 w-[min(380px,36%)] h-[48%] bg-page pt-4 pr-4" style={{ borderTopRightRadius: R }}>
        <ProfileCard v={v} />
      </div>
      <div aria-hidden className="hidden md:block absolute left-0 bottom-[48%]" style={{ width: R, height: R, background: `radial-gradient(circle at 100% 0%, transparent ${R - 0.5}px, var(--page) ${R}px)` }} />
      <div aria-hidden className="hidden md:block absolute bottom-0 left-[min(380px,36%)]" style={{ width: R, height: R, background: `radial-gradient(circle at 100% 0%, transparent ${R - 0.5}px, var(--page) ${R}px)` }} />
      {/* On a phone there is no room for the cut-out; the card sits under
          the banner instead. */}
      <div className="md:hidden mt-3">
        <ProfileCard v={v} />
      </div>
    </section>
  );
}

function ProfileCard({ v }: { v: PublicProfileView }) {
  const initial = (v.displayName[0] ?? "?").toUpperCase();
  return (
    <div className="h-full rounded-[22px] bg-card border border-hair p-[clamp(14px,1.6vw,22px)] flex flex-col justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-[clamp(48px,4.6vw,64px)] aspect-square rounded-full overflow-hidden bg-accent-fill text-on-accent flex items-center justify-center display text-3xl shrink-0 border-2 border-page shadow">
          {v.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        {/* The name is already on the banner in letters a foot high; the
            card carries the handle and what the person says about
            themselves. */}
        <div className="min-w-0">
          <div className="display text-[clamp(20px,1.9vw,28px)] leading-[.9] truncate">@{v.username}</div>
          <div className="text-[12px] text-dim">
            {v.stats.ratings} ratings · {v.reviews.length} reviews · {v.lists.length} lists
          </div>
        </div>
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

function FavouriteCard({ lead, rest, count }: { lead: ProfileTitle | null; rest: ProfileTitle[]; count: number }) {
  return (
    <div className="lg:col-span-3 rounded-[24px] bg-card border border-hair p-4 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="!text-[clamp(26px,2.4vw,34px)] leading-none">Favourites</h2>
        <span className="text-[12px] text-dim">{count}</span>
      </div>
      {lead ? (
        <Link href={lead.href} className="group relative block rounded-[18px] overflow-hidden aspect-[4/3] bg-card-hi no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {lead.backdrop && <img src={lead.backdrop} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute left-3 bottom-2.5 display text-white text-[22px] leading-[.9]">{lead.title}</span>
          <span className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#F4F1EA] text-[#1a1a19] flex items-center justify-center" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
          </span>
        </Link>
      ) : (
        <div className="rounded-[18px] aspect-[4/3] bg-card-hi flex items-center justify-center text-sm text-dim">No favourites yet</div>
      )}
      {rest.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {rest.map((t) => (
            <PosterLink key={t.key} t={t} small />
          ))}
        </div>
      )}
    </div>
  );
}

function HeadlineBlock({ v }: { v: PublicProfileView }) {
  const s = v.stats;
  const figures: [string, string | number][] = [
    ["Films", s.films],
    ["Shows", s.shows],
    ["Hours", s.hours],
    ["Avg rating", s.average ?? "—"],
  ];
  return (
    <div className="lg:col-span-4 flex flex-col justify-between gap-6 px-1 py-2">
      <div>
        <h2 className="!text-[clamp(40px,4.4vw,72px)] !leading-[.86]">
          Recently
          <br />
          watched
        </h2>
        <a href="#diary" className="inline-flex mt-5 px-5 py-2 rounded-full border border-ink/70 text-[12.5px] font-bold uppercase tracking-[.06em] text-ink no-underline hover:bg-ink hover:text-page transition-colors">
          Full diary
        </a>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {figures.map(([label, value]) => (
          <div key={label}>
            <div className="display text-[clamp(28px,2.6vw,40px)] leading-none text-accent">{value}</div>
            <div className="text-[10.5px] font-bold uppercase tracking-[.12em] text-dim mt-1">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LatestList({ entries }: { entries: DiaryEntry[] }) {
  return (
    <div className="lg:col-span-5 flex flex-col">
      {entries.length === 0 && <p className="text-sm text-dim">Nothing logged yet.</p>}
      {entries.map((e, i) => (
        <Link key={`${e.key}${e.date}`} href={e.href} className={`group flex gap-4 items-center py-3 no-underline ${i > 0 ? "border-t border-hair" : ""}`}>
          <div className="w-[clamp(64px,6vw,86px)] aspect-square rounded-[14px] overflow-hidden bg-card shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {e.backdrop && <img src={e.backdrop} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
          </div>
          <div className="min-w-0">
            <div className="display text-[clamp(20px,1.8vw,26px)] leading-[.95] text-ink truncate">{e.title}</div>
            <div className="text-[13px] text-dim mt-1 flex flex-wrap gap-x-2">
              <span>{prettyDate(e.date)}</span>
              {e.episodes && <span>{e.episodes}</span>}
              {e.rating != null && <Rating value={e.rating} />}
              {e.loved && <span className="text-loved">♥</span>}
            </div>
          </div>
        </Link>
      ))}
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
