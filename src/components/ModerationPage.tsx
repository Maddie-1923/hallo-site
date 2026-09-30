"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HeadingPill } from "./TitleParts";
import { REPORT_REASONS, type Report } from "@/lib/safety";
import { resolveReports } from "@/lib/safety-actions";
import * as Sentry from "@sentry/nextjs";
import { sentryDsn } from "@/lib/sentry-options";

// Moderation: every report, gathered by what was reported, the most-reported
// first. Each can be dismissed (nothing wrong), removed (the review, comment
// or list comes down), or its author suspended. Settled ones move to
// Resolved and can be reopened. It reads and writes the `reports` table.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";
const REASON = Object.fromEntries(REPORT_REASONS.map(([id, label]) => [id, label])) as Record<Report["reason"], string>;
const NOUN = { review: "review", comment: "comment", list: "list", profile: "profile" } as const;
const OUTCOME: Record<Report["status"], string> = { open: "Open", dismissed: "Dismissed", removed: "Removed", suspended: "Author suspended" };

export function ModerationPage({ initial }: { initial: Report[] }) {
  const [reports, setReports] = useState(initial);
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [tested, setTested] = useState<string | null>(null);
  // Checks crash reports reach Sentry: one error from this browser, one from
  // the server.
  async function testCrash() {
    if (!sentryDsn || process.env.NODE_ENV !== "production") {
      setTested("Crash reports are off here. They run on the live site once NEXT_PUBLIC_SENTRY_DSN is set.");
      return;
    }
    Sentry.captureException(new Error("Kodigo test crash from the browser (sent on purpose from Moderation)"));
    await fetch("/api/crash-test", { method: "POST" }).catch(() => {});
    setTested("Sent two test crashes, one from this browser and one from the server. They should show in Sentry within a minute.");
  }

  // One card per reported thing.
  const groups = useMemo(() => {
    const m = new Map<string, Report[]>();
    for (const r of reports) m.set(`${r.kind}:${r.target}`, [...(m.get(`${r.kind}:${r.target}`) ?? []), r]);
    return [...m.values()].map((rs) => ({ rs, status: rs.some((r) => r.status === "open") ? "open" : rs[0].status, latest: rs.reduce((a, r) => (r.at > a ? r.at : a), rs[0].at) }));
  }, [reports]);
  const open = groups.filter((g) => g.status === "open").sort((a, b) => b.rs.length - a.rs.length || (a.latest < b.latest ? 1 : -1));
  const resolved = groups.filter((g) => g.status !== "open").sort((a, b) => (a.latest < b.latest ? 1 : -1));
  const shown = tab === "open" ? open : resolved;

  async function settle(rs: Report[], status: Report["status"]) {
    const ids = rs.map((r) => r.id);
    if (await resolveReports(ids, status)) setReports((all) => all.map((r) => (ids.includes(r.id) ? { ...r, status } : r)));
  }

  return (
    <div className="max-w-[900px] mx-auto grid grid-cols-[minmax(0,1fr)] gap-8">
      <div className={SHELL}>
        <div className="rounded-shell bg-piece p-3">
          <h1 className="!text-[clamp(36px,5vw,60px)] !leading-[.9] tracking-[.02em] uppercase">Moderation</h1>
          <p className="m-0 mt-2 text-[12.5px] leading-[1.6] text-mid-tone max-w-[60ch]">
            Reports from members, the most-reported first. Check each against the <Link href="/terms#community-rules" className="text-accent no-underline hover:underline">community rules</Link>. Urgent ones, such as threats or anything involving children, go to the authorities too.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={testCrash} className="h-8 px-4 rounded-full bg-card border border-hair text-[12.5px] font-semibold text-ink cursor-pointer hover:text-accent">
              Send a test crash
            </button>
            {tested && <span className="text-[12.5px] text-dim">{tested}</span>}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <div role="tablist" className="inline-flex gap-1 p-1 rounded-full bg-card justify-self-start">
          {(
            [
              ["open", `Open · ${open.length}`],
              ["resolved", `Resolved · ${resolved.length}`],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`h-8 px-4 rounded-full text-[10.5px] font-bold uppercase tracking-[.12em] cursor-pointer ${tab === k ? "bg-accent-fill text-on-accent" : "text-dim hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className={SHELL}>
            <p className="m-0 rounded-shell bg-piece p-3 text-[12.5px] text-dim">{tab === "open" ? "Nothing to review. Every report has been dealt with." : "Nothing resolved yet."}</p>
          </div>
        ) : (
          shown.map(({ rs, status }) => {
            const r = rs[0];
            const reasons = [...new Set(rs.map((x) => x.reason))];
            const notes = rs.filter((x) => x.note);
            return (
              <article key={`${r.kind}:${r.target}`} className={SHELL}>
                <div className="rounded-shell bg-piece p-3 grid gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                    <HeadingPill small>{NOUN[r.kind]}</HeadingPill>
                    <Link href={`/u/${r.author}`} className="font-semibold text-ink no-underline hover:text-accent">
                      @{r.author}
                    </Link>
                    <span className="text-dim">
                      · {rs.length} {rs.length === 1 ? "report" : "reports"} · first {new Date(rs.reduce((a, x) => (x.at < a ? x.at : a), r.at)).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                    {status !== "open" && <span className="ml-auto text-[10.5px] font-bold uppercase tracking-[.12em] text-dim">{OUTCOME[status as Report["status"]]}</span>}
                  </div>
                  {r.excerpt && <blockquote className="m-0 rounded-[10px] bg-card px-3 py-2 text-[12.5px] leading-[1.6] text-ink">{r.excerpt}</blockquote>}
                  <div className="flex flex-wrap gap-1.5">
                    {reasons.map((x) => (
                      <span key={x} className="inline-flex items-center h-6 px-2.5 rounded-full bg-[color:var(--quiet)] text-[12px] text-ink">
                        {REASON[x]}
                        {rs.filter((y) => y.reason === x).length > 1 && ` × ${rs.filter((y) => y.reason === x).length}`}
                      </span>
                    ))}
                  </div>
                  {notes.length > 0 && (
                    <ul className="m-0 p-0 list-none grid gap-1">
                      {notes.map((x) => (
                        <li key={x.id} className="text-[12.5px] leading-[1.5] text-mid-tone">
                          <span className="text-dim">@{x.reporter}:</span> {x.note}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Link href={r.href} className="h-8 px-4 inline-flex items-center rounded-full bg-card border border-hair text-[12.5px] font-semibold text-ink no-underline hover:text-accent">
                      Open
                    </Link>
                    <span className="flex-1" />
                    {status === "open" ? (
                      <>
                        <button type="button" onClick={() => settle(rs, "dismissed")} className="h-8 px-4 rounded-full bg-card border border-hair text-[12.5px] font-semibold text-ink cursor-pointer hover:text-accent">
                          Dismiss
                        </button>
                        {r.kind !== "profile" && (
                          <button type="button" onClick={() => settle(rs, "removed")} className="h-8 px-4 rounded-full bg-loved/20 text-loved text-[12.5px] font-semibold cursor-pointer hover:bg-loved/30">
                            Remove {NOUN[r.kind]}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => confirm(`Suspend @${r.author}? Their profile and everything they've posted are hidden and they can't post until you lift it.`) && settle(rs, "suspended")}
                          className="h-8 px-4 rounded-full bg-loved text-white text-[12.5px] font-semibold cursor-pointer"
                        >
                          Suspend @{r.author}
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => settle(rs, "open")} className="h-8 px-4 rounded-full bg-card border border-hair text-[12.5px] font-semibold text-ink cursor-pointer hover:text-accent">
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
