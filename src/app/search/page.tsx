import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ListCard } from "@/components/ListCard";
import { ReviewCard } from "@/components/ReviewCard";
import { Unblocked } from "@/components/SafetySheets";
import { allLists } from "@/lib/lists";
import { searchMembers } from "@/lib/member-directory";
import { MEMBERS, type Member } from "@/lib/members";
import { loadProfile } from "@/lib/profile-previews";
import { searchReviews } from "@/lib/public-reads";
import type { ReviewEntry } from "@/lib/public-profile";
import { image, searchEverything } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Search — Kodigo" };

// Search (docs/social-plan.md, step 5.4): one box, and the results in tabs:
// titles and people from TMDB, and from Kodigo members, lists and reviews.
// The tab is part of the address (?q=…&tab=people), so any search can be
// shared. It opens on the first tab with something in it.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";
const TABS = [
  ["titles", "Titles"],
  ["people", "People"],
  ["members", "Members"],
  ["lists", "Lists"],
  ["reviews", "Reviews"],
] as const;
type Tab = (typeof TABS)[number][0];
const DEV = process.env.NODE_ENV === "development";

export default async function Search({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const asked = typeof params.tab === "string" ? (params.tab as Tab) : null;

  const [tmdb, members, lists, reviews] = q
    ? await Promise.all([searchEverything(q), findMembers(q), findLists(q), findReviews(q)])
    : [{ titles: [], people: [] }, [], [], []];
  const counts: Record<Tab, number> = { titles: tmdb.titles.length, people: tmdb.people.length, members: members.length, lists: lists.length, reviews: reviews.length };
  const tab: Tab = asked && TABS.some((t) => t[0] === asked) ? asked : (TABS.find((t) => counts[t[0]] > 0)?.[0] ?? "titles");
  const to = (t: Tab) => `/search?q=${encodeURIComponent(q)}&tab=${t}`;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <div className="max-w-[1100px] mx-auto grid grid-cols-[minmax(0,1fr)] gap-6">
          <div className={SHELL}>
            <form action="/search" className="rounded-shell bg-piece p-3 flex flex-wrap items-center gap-2">
              <h1 className="!text-[clamp(32px,4.4vw,48px)] !leading-[.9] tracking-[.02em] uppercase mr-auto">Search</h1>
              <label className="flex items-center gap-2 h-10 px-4 rounded-full bg-card border border-hair focus-within:border-accent flex-1 min-w-[220px] max-w-[520px]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden className="text-dim shrink-0">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <input name="q" type="search" defaultValue={q} autoFocus={!q} autoComplete="off" placeholder="Titles, people, members, lists, reviews" aria-label="Search" className="flex-1 min-w-0 bg-transparent text-[13px] text-ink placeholder:text-dim focus:outline-none" />
              </label>
              {tab !== "titles" && <input type="hidden" name="tab" value={tab} />}
              <button type="submit" className="h-10 px-5 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold cursor-pointer">
                Search
              </button>
            </form>
          </div>

          {q && (
            <>
              <nav aria-label="Results" className="flex flex-wrap gap-1 p-1 rounded-[18px] bg-card self-start justify-self-start max-w-full">
                {TABS.map(([id, label]) => (
                  <Link
                    key={id}
                    href={to(id)}
                    aria-current={tab === id ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[10.5px] leading-none font-bold uppercase tracking-[.12em] no-underline transition-colors ${tab === id ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
                  >
                    {label}
                    <span className="tabular-nums opacity-70">{counts[id]}</span>
                  </Link>
                ))}
              </nav>

              <div className={SHELL}>
                <div className="rounded-shell bg-piece p-2 min-h-[200px]">
                  {counts[tab] === 0 ? (
                    <p className="m-0 p-3 text-[12.5px] text-dim">
                      No {TABS.find((t) => t[0] === tab)![1].toLowerCase()} match &ldquo;{q}&rdquo;.{tab === "titles" ? " Try fewer words, or the original title." : ""}
                    </p>
                  ) : tab === "titles" ? (
                    <Posters
                      items={tmdb.titles.map((h) =>
                        h.kind === "show"
                          ? { key: `s${h.show.id}`, href: `/show/${h.show.id}`, poster: image.poster(h.show.poster_path, "w342"), title: h.show.name, sub: [h.show.first_air_date?.slice(0, 4), "Series"].filter(Boolean).join(" · ") }
                          : { key: `m${h.movie.id}`, href: `/movie/${h.movie.id}`, poster: image.poster(h.movie.poster_path, "w342"), title: h.movie.title, sub: [h.movie.release_date?.slice(0, 4), "Film"].filter(Boolean).join(" · ") },
                      )}
                    />
                  ) : tab === "people" ? (
                    <Posters items={tmdb.people.map((p) => ({ key: `p${p.id}`, href: `/person/${p.id}`, poster: p.photo, title: p.name, sub: [p.department, p.knownFor.join(", ")].filter(Boolean).join(" · ") }))} />
                  ) : tab === "members" ? (
                    <ul className="m-0 p-0 list-none divide-y divide-hair">
                      {members.map((m) => (
                        <li key={m.username}>
                          <Unblocked username={m.username}>
                            <Link href={`/u/${m.username}`} className="group flex items-center gap-3 p-2 no-underline text-ink">
                              <span className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-accent-fill text-on-accent flex items-center justify-center display text-[18px]">
                                {m.avatar ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={m.avatar} alt="" className="w-full h-full object-cover object-top" />
                                ) : (
                                  m.username[0].toUpperCase()
                                )}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[12.5px] font-semibold truncate group-hover:text-accent">@{m.username}</span>
                                <span className="block text-[12.5px] text-dim truncate">{[m.displayName, m.location, m.isPrivate ? "Private profile" : ""].filter(Boolean).join(" · ")}</span>
                              </span>
                            </Link>
                          </Unblocked>
                        </li>
                      ))}
                    </ul>
                  ) : tab === "lists" ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {lists.map((l) => (
                        <Unblocked key={`${l.owner}/${l.id}`} username={l.owner}>
                          <ListCard l={l} />
                        </Unblocked>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {reviews.map(({ review, username, avatar }) => (
                        <Unblocked key={`${username}-${review.key}`} username={username}>
                          <ReviewCard r={review} username={username} avatar={avatar} />
                        </Unblocked>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Pictures in a grid, each to its page: titles' posters and people's photos. */
function Posters({ items }: { items: { key: string; href: string; poster: string | null; title: string; sub: string }[] }) {
  return (
    <ol className="m-0 p-0 list-none grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
      {items.map((i) => (
        <li key={i.key} className="min-w-0">
          <Link href={i.href} className="group block no-underline text-ink">
            <span className="block aspect-[2/3] rounded-[10px] overflow-hidden bg-card border border-hair group-hover:border-accent transition-colors">
              {i.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
              )}
            </span>
            <span className="block mt-1.5 text-[12.5px] leading-[16px] truncate group-hover:text-accent transition-colors">{i.title}</span>
            <span className="block text-[12.5px] leading-[16px] text-dim truncate">{i.sub}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

const has = (q: string, ...texts: (string | null | undefined)[]) => texts.some((t) => t?.toLowerCase().includes(q.toLowerCase()));

/** Members by username or name: the account's search, or the sample members in development. */
async function findMembers(q: string): Promise<Member[]> {
  const real = await searchMembers(q);
  if (real) return real;
  return DEV ? MEMBERS.filter((m) => has(q, m.username, m.displayName, m.location)) : [];
}

async function findLists(q: string) {
  return (await allLists()).filter((l) => has(q, l.name, l.detail, ...l.titles.map((t) => t.title)));
}

/** Reviews whose title or words match: members' own, or the samples in development. */
async function findReviews(q: string): Promise<{ review: ReviewEntry; username: string; avatar: string | null }[]> {
  const real = await searchReviews(q);
  if (real.length || !DEV) return real;
  const views = await Promise.all(["preview", ...MEMBERS.slice(0, 5).map((m) => m.username)].map((u) => loadProfile(u)));
  return views.flatMap((v) => (v ? v.reviews.filter((r) => has(q, r.title, r.text)).map((review) => ({ review, username: v.username, avatar: v.avatar })) : []));
}
