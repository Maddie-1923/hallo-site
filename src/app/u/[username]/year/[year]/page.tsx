import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Day } from "@/components/Day";
import { ShareLink } from "@/components/ShareLink";
import { YearChart } from "@/components/YearChart";
import { previewArchive } from "@/lib/profile-previews";
import { yearReview, type YearTitle } from "@/lib/year-review";

type Params = PageProps<"/u/[username]/year/[year]">;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, year } = await params;
  return { title: `@${username}'s ${year} in review — Kodigo` };
}

// Year in Review at /u/<name>/year/<year>: the year in numbers, the shows and
// films it was made of, month by month, the genres and moods, and where it
// began and ended. From the library's watch dates; the development preview's
// until accounts.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";
const H = "inline-flex items-center h-[34px] px-4 rounded-full bg-piece ![font-family:var(--font-body)] !font-bold !text-[10.5px] !leading-none !tracking-[.12em] uppercase text-ink";
const MOODS: Record<string, string> = { "Loved it": "❤️", "Hated it": "😡", "Liked it": "🙂", Sad: "😭", "On Edge": "🫣", Boring: "🥱", Frustrated: "😤", "Let down": "😞", Hot: "❤️‍🔥", Shocked: "🤯", Scared: "😱", Confused: "🙃" };

export default async function YearInReview({ params }: Params) {
  const { username, year } = await params;
  const archive = username === "preview" ? await previewArchive() : null;
  const r = archive ? yearReview(archive, Number(year)) : null;
  if (!r) notFound();
  const hero = r.topShows[0]?.backdrop ?? r.topFilms[0]?.backdrop ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <div className="max-w-[1040px] mx-auto grid grid-cols-[minmax(0,1fr)] gap-8">
          {/* The year, big, over the picture of what they watched most. */}
          <div className="relative overflow-hidden rounded-shell bg-card min-h-[300px] flex items-end">
            {hero && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(20deg,rgba(0,0,0,.8)_0%,rgba(0,0,0,.45)_45%,rgba(0,0,0,.1)_80%)]" />
            <div className="relative p-[clamp(20px,3vw,40px)] w-full flex flex-wrap items-end justify-between gap-4 text-white">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[.12em] text-white/85">@{username} · Year in review</div>
                <div className="display text-[clamp(96px,16vw,176px)] leading-[.8] mt-2">{r.year}</div>
              </div>
              <div className="grid justify-items-end gap-2">
                <ShareLink title={`@${username}'s ${r.year} in review on Kodigo`} />
                {r.years.length > 1 && (
                  <div className="flex flex-wrap justify-end gap-1">
                    {r.years.map((y) => (
                      <Link key={y} href={`/u/${username}/year/${y}`} className={`px-2.5 py-1 rounded-full text-[12.5px] font-semibold no-underline ${y === r.year ? "bg-white text-black" : "bg-black/35 text-white hover:bg-black/55"}`}>
                        {y}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Group title="The year in numbers">
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
              {[
                [r.hours.toLocaleString("en"), "hours watched"],
                [r.episodes.toLocaleString("en"), r.episodes === 1 ? "episode" : "episodes"],
                [r.films.toLocaleString("en"), r.films === 1 ? "film" : "films"],
                [r.shows.toLocaleString("en"), r.shows === 1 ? "series" : "series"],
              ].map(([n, label]) => (
                <div key={label} className="rounded-shell bg-piece p-3">
                  <div className="display text-[clamp(40px,5vw,56px)] leading-none">{n}</div>
                  <div className="mt-1 text-[12.5px] text-dim">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 rounded-shell bg-piece divide-y divide-hair">
              {[
                r.busiestDay && ["Busiest day", <>
                  <Day iso={r.busiestDay.date} /> · {r.busiestDay.count} {r.busiestDay.count === 1 ? "watch" : "watches"}
                </>],
                ["Longest streak", `${r.streak} ${r.streak === 1 ? "day" : "days"} in a row`],
                r.weekday && ["Favourite day to watch", `${r.weekday}s`],
                ["Loved", `${r.loved} ${r.loved === 1 ? "title" : "titles"}`],
              ]
                .filter(Boolean)
                .map((row) => {
                  const [label, value] = row as [string, React.ReactNode];
                  return (
                    <div key={label} className="flex items-baseline justify-between gap-4 px-3 py-[9px] text-[12.5px]">
                      <span className="text-dim">{label}</span>
                      <span className="text-ink text-right">{value}</span>
                    </div>
                  );
                })}
            </div>
          </Group>

          {r.topShows.length > 0 && (
            <Group title="The series you watched most">
              <Posters list={r.topShows} line={(t) => `${t.count} ${t.count === 1 ? "episode" : "episodes"}`} />
            </Group>
          )}
          {r.topFilms.length > 0 && (
            <Group title="Your films">
              <Posters list={r.topFilms} line={(t) => (t.rating != null ? `Rated ${t.rating}` : "Watched")} />
            </Group>
          )}

          <Group title="Month by month">
            <div className="rounded-shell bg-piece p-3">
              <YearChart months={r.months} />
            </div>
          </Group>

          <div className="grid gap-8 md:grid-cols-2">
            {r.genres.length > 0 && (
              <Group title="Your genres">
                <div className="rounded-shell bg-piece p-3 grid gap-3">
                  {r.genres.map((g) => (
                    <div key={g.name} className="grid gap-1">
                      <div className="flex justify-between text-[12.5px]">
                        <span className="text-ink">{g.name}</span>
                        <span className="text-dim tabular-nums">{Math.round(g.share * 100)}%</span>
                      </div>
                      <div className="h-[6px] rounded-full bg-track overflow-hidden">
                        <div className="h-full rounded-full bg-accent-fill" style={{ width: `${Math.max(2, g.share * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Group>
            )}
            <Group title="Where it began and ended">
              <div className="grid gap-2">
                {([["First", r.first], ["Last", r.last]] as const).map(([label, e]) =>
                  e ? (
                    <Link key={label} href={e.t.href} className="rounded-shell bg-piece p-3 flex items-center gap-3 no-underline text-ink group">
                      <span className="shrink-0 w-12 aspect-[2/3] rounded-[8px] overflow-hidden bg-card border border-hair">
                        {e.t.poster && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.t.poster} alt="" className="w-full h-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 text-[12.5px] leading-[1.5]">
                        <span className="block text-[10.5px] font-bold uppercase tracking-[.12em] text-dim">
                          {label} · <Day iso={e.date} style="short" />
                        </span>
                        <span className="block font-semibold truncate group-hover:text-accent transition-colors">{e.t.title}</span>
                        {e.detail && <span className="block text-dim">{e.detail}</span>}
                      </span>
                    </Link>
                  ) : null,
                )}
              </div>
            </Group>
          </div>

          {r.moods.length > 0 && (
            <Group title="How it left you">
              <div className="rounded-shell bg-piece p-3 flex flex-wrap gap-2">
                {r.moods.map((m) => (
                  <span key={m.name} className="inline-flex items-center gap-2 rounded-full bg-card border border-hair px-3 py-1.5 text-[12.5px]">
                    <span aria-hidden>{MOODS[m.name] ?? "•"}</span>
                    <span className="text-ink">{m.name}</span>
                    <span className="text-dim tabular-nums">{m.count}</span>
                  </span>
                ))}
              </div>
            </Group>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <div>
        <h2 className={H}>{title}</h2>
      </div>
      <div className={SHELL}>{children}</div>
    </section>
  );
}

function Posters({ list, line }: { list: YearTitle[]; line: (t: YearTitle) => string }) {
  return (
    <ol className="m-0 p-0 list-none grid gap-2 grid-cols-3 sm:grid-cols-5">
      {list.map((t, i) => (
        <li key={t.key} className="min-w-0">
          <Link href={t.href} className="group block rounded-shell bg-piece p-1.5 no-underline text-ink">
            <span className="relative block aspect-[2/3] rounded-[10px] overflow-hidden bg-card border border-hair">
              {t.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.poster} alt="" className="w-full h-full object-cover" />
              )}
              <span className="absolute left-1.5 top-1.5 w-7 h-7 rounded-full bg-accent-fill text-on-accent flex items-center justify-center display text-[17px] leading-none pt-[2px]">{i + 1}</span>
            </span>
            <span className="block px-1 pt-1.5 text-[12.5px] leading-[16px] font-semibold truncate group-hover:text-accent transition-colors">{t.title}</span>
            <span className="block px-1 pb-0.5 text-[12.5px] leading-[16px] text-dim">{line(t)}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
