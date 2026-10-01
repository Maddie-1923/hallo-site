"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DECADES, GENRES, NETWORKS, SORTS, STATUSES, path, slug, type Filters } from "@/lib/browse";
import { browseResults } from "@/lib/browse-actions";
import { useSettings } from "@/lib/settings";
import type { BrowseTitle, Service } from "@/lib/tmdb";
import { Menu } from "./Menu";

// Browse: films or series, narrowed by filters that stack (genre, decade,
// where to watch, and for series the network and whether it's still on),
// sorted as chosen. Every change is a new address, so any combination can be
// shared. "My services" fills where to watch from Settings.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";

export function BrowsePage({ filters: f, first, services }: { filters: Filters; first: { results: BrowseTitle[]; pages: number; total: number }; services: Service[] }) {
  const router = useRouter();
  const [settings] = useSettings();
  const [more, setMore] = useState<BrowseTitle[]>([]);
  const [page, setPage] = useState(1);
  const [loading, start] = useTransition();
  const go = (next: Partial<Filters>) => {
    setMore([]);
    setPage(1);
    router.push(path({ ...f, ...next }));
  };
  const loadMore = () =>
    start(async () => {
      const r = await browseResults(f, page + 1);
      setMore((m) => [...m, ...r.results]);
      setPage((p) => p + 1);
    });

  const genres = GENRES[f.kind];
  const genreName = genres.find(([, n]) => slug(n) === f.genre)?.[1];
  const serviceName = (s: string) => services.find((x) => slug(x.name) === s)?.name ?? s;
  const mine = services.filter((s) => settings.services.includes(s.id)).map((s) => slug(s.name));
  const titles = [...first.results, ...more.filter((m) => !first.results.some((x) => x.id === m.id))];

  const chips: [string, Partial<Filters>][] = [
    ...(genreName ? [[genreName, { genre: undefined }] as [string, Partial<Filters>]] : []),
    ...(f.decade ? [[f.year ?? f.decade, f.year ? { year: undefined } : { decade: undefined, year: undefined }] as [string, Partial<Filters>]] : []),
    ...(f.on ?? []).map((s) => [serviceName(s), { on: f.on!.filter((x) => x !== s) }] as [string, Partial<Filters>]),
    ...(f.network ? [[NETWORKS.find(([, n]) => slug(n) === f.network)?.[1] ?? f.network, { network: undefined }] as [string, Partial<Filters>]] : []),
    ...(f.status ? [[STATUSES.find(([s]) => s === f.status)?.[1] ?? f.status, { status: undefined }] as [string, Partial<Filters>]] : []),
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <div className={SHELL}>
        <div className="rounded-shell bg-piece p-3 grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase">Browse {f.kind}</h1>
              <p className="m-0 mt-2 text-[1.0417rem] text-mid-tone">{first.total ? `${first.total.toLocaleString("en")} ${f.kind === "films" ? "films" : "series"}` : "Nothing matches these filters."}</p>
            </div>
            <div role="tablist" aria-label="Films or series" className="inline-flex gap-1 p-1 rounded-full bg-card">
              {(["films", "series"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={f.kind === k}
                  onClick={() => go({ kind: k, genre: undefined, network: undefined, status: undefined })}
                  className={`px-4 py-2 rounded-full text-[0.875rem] leading-none font-bold uppercase tracking-[.12em] cursor-pointer transition-colors ${f.kind === k ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
                >
                  {k === "films" ? "Films" : "Series"}
                </button>
              ))}
            </div>
          </div>

          {/* The filters, each a menu. */}
          <div className="flex flex-wrap items-center gap-2">
            <Pick label={genreName ?? "Genre"} on={!!genreName}>
              <Option on={!f.genre} onClick={() => go({ genre: undefined })}>
                Any genre
              </Option>
              {genres.map(([, n]) => (
                <Option key={n} on={slug(n) === f.genre} onClick={() => go({ genre: slug(n) })}>
                  {n}
                </Option>
              ))}
            </Pick>
            <Pick label={f.year ?? f.decade ?? "Decade"} on={!!f.decade}>
              <Option on={!f.decade} onClick={() => go({ decade: undefined, year: undefined })}>
                Any time
              </Option>
              {DECADES.map((d) => (
                <Option key={d} on={d === f.decade && !f.year} onClick={() => go({ decade: d, year: undefined })}>
                  {d}
                </Option>
              ))}
              {/* Once a decade is chosen, its years, to narrow it to one. */}
              {f.decade && (
                <>
                  <div className="px-3 pt-2 pb-1 text-[0.875rem] font-bold uppercase tracking-[.12em] text-dim">{f.decade} by year</div>
                  {Array.from({ length: 10 }, (_, i) => String(Number(f.decade!.slice(0, 4)) + i))
                    .filter((y) => Number(y) <= new Date().getFullYear() + 1)
                    .map((y) => (
                      <Option key={y} on={y === f.year} onClick={() => go({ year: y })}>
                        {y}
                      </Option>
                    ))}
                </>
              )}
            </Pick>
            <Pick label={f.on?.length ? (f.on.length === 1 ? serviceName(f.on[0]) : `${f.on.length} services`) : "Where to watch"} on={!!f.on?.length} wide>
              {mine.length > 0 && (
                <Option on={mine.length > 0 && mine.every((m) => f.on?.includes(m)) && f.on?.length === mine.length} onClick={() => go({ on: mine })}>
                  My services
                </Option>
              )}
              <Option on={!f.on?.length} onClick={() => go({ on: undefined })}>
                Anywhere
              </Option>
              {services.map((s) => {
                const k = slug(s.name);
                const on = !!f.on?.includes(k);
                return (
                  <Option key={s.id} on={on} keepOpen onClick={() => go({ on: on ? f.on!.filter((x) => x !== k) : [...(f.on ?? []), k] })}>
                    <span className="inline-flex items-center gap-2">
                      {s.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo} alt="" className="w-5 h-5 rounded-[5px]" />
                      )}
                      {s.name}
                    </span>
                  </Option>
                );
              })}
            </Pick>
            {f.kind === "series" && (
              <>
                <Pick label={NETWORKS.find(([, n]) => slug(n) === f.network)?.[1] ?? "Network"} on={!!f.network}>
                  <Option on={!f.network} onClick={() => go({ network: undefined })}>
                    Any network
                  </Option>
                  {NETWORKS.map(([, n]) => (
                    <Option key={n} on={slug(n) === f.network} onClick={() => go({ network: slug(n) })}>
                      {n}
                    </Option>
                  ))}
                </Pick>
                <Pick label={STATUSES.find(([s]) => s === f.status)?.[1] ?? "Status"} on={!!f.status}>
                  <Option on={!f.status} onClick={() => go({ status: undefined })}>
                    Any status
                  </Option>
                  {STATUSES.map(([s, n]) => (
                    <Option key={s} on={s === f.status} onClick={() => go({ status: s })}>
                      {n}
                    </Option>
                  ))}
                </Pick>
              </>
            )}
            <span className="ml-auto" />
            <Pick label={SORTS.find(([s]) => s === f.sort)?.[1] ?? "Sort"} on align="right">
              {SORTS.map(([s, n]) => (
                <Option key={s} on={s === f.sort} onClick={() => go({ sort: s })}>
                  {n}
                </Option>
              ))}
            </Pick>
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map(([label, off]) => (
                <button key={label} type="button" onClick={() => go(off)} className="inline-flex items-center gap-1.5 rounded-full bg-card border border-hair px-3 py-1 text-[1.0417rem] text-ink cursor-pointer hover:border-dim">
                  {label}
                  <span aria-hidden className="text-dim">×</span>
                </button>
              ))}
              <button type="button" onClick={() => go({ genre: undefined, decade: undefined, year: undefined, on: undefined, network: undefined, status: undefined })} className="text-[1.0417rem] text-dim hover:text-ink cursor-pointer px-1">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {titles.length > 0 && (
        <div className={SHELL}>
          <ul className="m-0 p-0 list-none grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
            {titles.map((t) => (
              <li key={`${t.kind}${t.id}`} className="min-w-0">
                <Link href={`/${t.kind}/${t.id}`} className="group block rounded-shell bg-piece p-1.5 no-underline text-ink">
                  <span className="block aspect-[2/3] rounded-[10px] overflow-hidden bg-card border border-hair">
                    {t.poster && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.poster} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    )}
                  </span>
                  <span className="block px-1 pt-1.5 text-[1.0417rem] leading-[1.3333rem] font-semibold truncate group-hover:text-accent transition-colors">{t.title}</span>
                  <span className="block px-1 pb-0.5 text-[1.0417rem] leading-[1.3333rem] text-dim">
                    {t.year || "—"}
                    {t.vote ? ` · ${t.vote.toFixed(1)}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {page < first.pages && (
            <div className="pt-2 flex justify-center">
              <button type="button" onClick={loadMore} disabled={loading} className="h-9 px-5 rounded-full bg-piece text-[1.0417rem] font-semibold text-ink cursor-pointer hover:text-accent disabled:opacity-50">
                {loading ? "Loading…" : "Show more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** A filter's pill, opening its choices. */
function Pick({ label, on, children, wide = false, align = "left" }: { label: string; on: boolean; children: React.ReactNode; wide?: boolean; align?: "left" | "right" }) {
  return (
    <Menu
      label={label}
      width={wide ? 260 : 200}
      align={align}
      button={
        <span className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[1.0417rem] font-semibold border transition-colors ${on ? "bg-ink text-page border-transparent" : "bg-card text-ink border-hair hover:border-dim"}`}>
          {label}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      }
    >
      <div className="soft-scroll max-h-[30rem] overflow-y-auto py-1.5">{children}</div>
    </Menu>
  );
}

function Option({ on, onClick, children, keepOpen = false }: { on: boolean; onClick: () => void; children: React.ReactNode; keepOpen?: boolean }) {
  return (
    <button type="button" {...(keepOpen ? {} : { "data-menu-close": true })} onClick={onClick} aria-pressed={on} className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-[1.0417rem] text-left cursor-pointer hover:bg-card-hi ${on ? "text-accent font-semibold" : "text-ink"}`}>
      {children}
      {on && <span aria-hidden>✓</span>}
    </button>
  );
}
