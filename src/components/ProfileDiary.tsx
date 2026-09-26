"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DiaryEntry } from "@/lib/public-profile";
import { MarkReview, MarkRewatched, TightHeart } from "./marks";

// The profile's Diary: every watch as a row in a table, a year at a time.
// The columns read in the order a diary entry is thought about: when, what,
// how it was watched (which episodes, whether a rewatch), then what they
// thought (hearts, a like, a review). The release year rides with the title,
// the way a title is said aloud. Series get the Episodes column, which a
// films-only diary like Letterboxd's has no need for. A switch shows films,
// series or both.
//
// The whole diary arrives from the server; showing one year at a time keeps
// a long one readable without paging.
export function ProfileDiary({ entries }: { entries: DiaryEntry[] }) {
  const [kind, setKind] = useState<"all" | "movie" | "show">("all");
  const years = useMemo(() => [...new Set(entries.map((e) => e.date.slice(0, 4)))].sort().reverse(), [entries]);
  const [year, setYear] = useState(years[0] ?? "");

  const rows = entries.filter((e) => e.date.startsWith(year) && (kind === "all" || e.kind === kind));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="inline-flex p-[3px] rounded-full bg-page border border-hair">
          {(
            [
              ["all", "All"],
              ["movie", "Films"],
              ["show", "Series"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`px-3.5 py-1 rounded-full text-[12.5px] font-semibold cursor-pointer transition-colors ${kind === k ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-[12.5px] text-dim">
          Year
          <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-full bg-page border border-hair px-3 py-1 text-ink text-[12.5px] font-semibold cursor-pointer">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <span className="text-[12.5px] text-dim ml-auto">
          {rows.length} {rows.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-dim m-0">Nothing logged here.</p>
      ) : (
        <table className="w-full border-separate border-spacing-y-[6px] -my-[6px] text-[14px]">
          {/* Each entry is its own shell rather than a row between hairlines:
            the table is set with space between its rows, and every cell from
            the day to the last mark is filled, with the ends rounded. The
            month tag sits outside the shell, in the margin, the way a diary
            heads a new month. */}
          <thead>
            <tr className="text-[10.5px] font-bold uppercase tracking-[.12em] text-dim text-left">
              <th colSpan={2} className="py-2 pr-3 font-bold w-[132px]">Date</th>
              <th className="py-2 px-3 font-bold">Title</th>
              <th className="py-2 px-3 font-bold hidden md:table-cell w-[140px]">Episodes</th>
              <th className="py-2 px-2 font-bold text-center w-[64px] hidden sm:table-cell">Rewatch</th>
              <th className="py-2 px-3 font-bold w-[128px]">Rating</th>
              <th className="py-2 px-2 font-bold text-center w-[48px]">Like</th>
              <th className="py-2 pl-2 font-bold text-center w-[56px] hidden sm:table-cell">Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => {
              // The month shows once, on its first row, the way a diary page
              // heads a new month.
              const newMonth = i === 0 || rows[i - 1].date.slice(0, 7) !== e.date.slice(0, 7);
              return (
                <tr key={`${e.key}${e.date}`} className="align-middle">
                  <td className="py-1.5 pr-3 align-middle">
                    {newMonth && (
                      <span className="inline-flex flex-col items-center justify-center w-[64px] rounded-[10px] bg-page border border-hair py-1 leading-none">
                        <span className="display text-[20px] text-ink">{month(e.date)}</span>
                        <span className="text-[10.5px] text-dim mt-0.5">{e.date.slice(0, 4)}</span>
                      </span>
                    )}
                  </td>
                  <td className={`${SHELL} rounded-l-[14px] py-2 pl-3 pr-3 text-right display text-[26px] leading-none text-dim`}>{Number(e.date.slice(8, 10))}</td>
                  <td className={`${SHELL} py-2 px-3`}>
                    <Link href={e.href} className="flex items-center gap-3 no-underline text-ink hover:text-accent group">
                      <span className="w-9 shrink-0">
                        {e.poster ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.poster} alt="" className="w-9 aspect-[2/3] rounded-[4px] object-cover" />
                        ) : (
                          <span className="block w-9 aspect-[2/3] rounded-[4px] bg-card-hi" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">
                          <span className="font-semibold">{e.title}</span>
                          {e.year && <span className="text-dim font-normal"> {e.year}</span>}
                        </span>
                        {/* On a phone the Episodes column folds in under the
                            title. */}
                        {e.episodes && <span className="block md:hidden text-[12px] text-dim truncate">{e.episodes}</span>}
                      </span>
                    </Link>
                  </td>
                  <td className={`${SHELL} py-2 px-3 text-dim hidden md:table-cell`}>{e.episodes ?? "—"}</td>
                  <td className={`${SHELL} py-2 px-2 text-center hidden sm:table-cell`}>
                    {e.rewatch ? (
                      <span className="inline-flex text-accent" title="Rewatch">
                        <MarkRewatched size={22} />
                        <span className="sr-only">Rewatch</span>
                      </span>
                    ) : null}
                  </td>
                  <td className={`${SHELL} py-2 px-3`}>{e.rating != null ? <Hearts value={e.rating} /> : <span className="text-dim">—</span>}</td>
                  <td className={`${SHELL} py-2 px-2 text-center rounded-r-[14px] sm:rounded-r-none`}>
                    {e.loved ? (
                      <span className="inline-flex text-loved" title="Loved">
                        <TightHeart size={15} />
                        <span className="sr-only">Loved</span>
                      </span>
                    ) : null}
                  </td>
                  <td className={`${SHELL} rounded-r-[14px] py-2 pl-2 pr-3 text-center hidden sm:table-cell`}>
                    {e.reviewed ? (
                      <Link href={e.href} className="inline-flex text-accent" title="Has a review">
                        <MarkReview size={22} />
                        <span className="sr-only">Read the review</span>
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// A rating out of ten as the app shows it: ten small hearts, lit to the
// rating, a half heart for a half point.
// The fill of an entry's shell: the lighter card tone, on the section's card.
const SHELL = "bg-card-hi";

function Hearts({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-[2px]" title={`${value} out of 10`}>
      {Array.from({ length: 10 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-flex">
            <TightHeart size={10} className="text-ink/20" />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden text-accent" style={{ width: `${fill * 100}%` }}>
                <TightHeart size={10} />
              </span>
            )}
          </span>
        );
      })}
      <span className="sr-only">{value} out of 10</span>
    </span>
  );
}

function month(d: string) {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(d.slice(5, 7)) - 1];
}
