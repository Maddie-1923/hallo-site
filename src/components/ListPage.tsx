"use client";

import Link from "next/link";
import { useState } from "react";
import type { ListView } from "@/lib/lists";
import { HeadingPill } from "./TitleParts";
import { MoreButton } from "./SafetySheets";
import { useSafety } from "@/lib/safety";
import { checkText } from "@/lib/word-filter";

// A list's own page: its name and whose it is, what it's about, how much of
// it you've watched, like and share; then every title in order, the watched
// ones marked; then what people said. Likes and comments are saved with
// accounts; until then the like button only changes the page, and a comment
// shows for the visit (after the word filter). The ⋯ on the list and on each
// comment reports it or blocks whoever posted it; blocked people's comments
// don't show.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";

export function ListPage({ l, watched }: { l: ListView; watched: string[] }) {
  const [liked, setLiked] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [added, setAdded] = useState<{ who: string; text: string; ago: string }[]>([]);
  const [refused, setRefused] = useState<string | null>(null);
  const { blocked } = useSafety();
  const comments = [...l.comments, ...added].filter((c) => !blocked.includes(c.who));
  function post() {
    const text = draft.trim();
    if (!text) return;
    const problem = checkText(text);
    setRefused(problem);
    if (problem) return;
    setAdded((a) => [...a, { who: "preview", text, ago: "just now" }]);
    setDraft("");
  }
  const seen = l.titles.filter((t) => watched.includes(t.key)).length;
  const pct = l.titles.length ? Math.round((seen / l.titles.length) * 100) : 0;
  async function share() {
    const url = location.href.split("#")[0];
    try {
      if (navigator.share) await navigator.share({ url, title: `${l.name} — a list on Kodigo` });
      else {
        await navigator.clipboard.writeText(url);
        setSaid("Link copied");
        setTimeout(() => setSaid(null), 2400);
      }
    } catch {}
  }

  return (
    <div className="max-w-[1040px] mx-auto grid grid-cols-[minmax(0,1fr)] gap-8">
      <div className={SHELL}>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-shell bg-piece p-3">
            <Link href={`/u/${l.owner}`} className="inline-flex items-center gap-2 no-underline text-ink group">
              <span className="w-7 h-7 rounded-full bg-accent-fill text-on-accent flex items-center justify-center display text-[15px] leading-none pt-[2px]">{l.owner[0].toUpperCase()}</span>
              <span className="text-[12.5px] font-semibold group-hover:text-accent transition-colors">@{l.owner}</span>
            </Link>
            <MoreButton what={{ kind: "list", target: `${l.owner}/${l.id}`, author: l.owner, href: `/u/${l.owner}/list/${l.id}`, excerpt: l.name }} className="float-right -mt-0.5" />
            <h1 className="mt-3 !text-[clamp(32px,4.4vw,52px)] !leading-[.95] tracking-[.02em] uppercase">{l.name}</h1>
            {l.detail && <p className="m-0 mt-2 text-[12.5px] leading-[1.6] text-mid-tone">{l.detail}</p>}
            <div className="mt-2 text-[12.5px] text-dim">
              {l.titles.length} {l.titles.length === 1 ? "title" : "titles"}
            </div>
          </div>
          <div className="rounded-shell bg-piece p-3 flex flex-col gap-3">
            <div>
              <div className="flex items-baseline justify-between text-[12.5px]">
                <span className="text-ink">
                  You&apos;ve watched <b className="font-semibold tabular-nums">{seen}</b> of <b className="font-semibold tabular-nums">{l.titles.length}</b>
                </span>
                <span className="text-dim tabular-nums">{pct}%</span>
              </div>
              <div className="mt-2 h-[3px] rounded-full bg-track overflow-hidden">
                <div className="h-full rounded-full bg-accent-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-1.5">
              <button
                type="button"
                aria-pressed={liked}
                onClick={() => setLiked(!liked)}
                className={`h-[46px] rounded-[12px] flex flex-col items-center justify-center gap-0.5 text-[12.5px] font-semibold cursor-pointer transition-colors ${liked ? "bg-accent-fill text-on-accent" : "bg-card text-dim hover:text-ink"}`}
              >
                <span aria-hidden>{liked ? "♥" : "♡"}</span>
                {l.likes + (liked ? 1 : 0)} {l.likes + (liked ? 1 : 0) === 1 ? "like" : "likes"}
              </button>
              <button type="button" onClick={share} className="h-[46px] rounded-[12px] bg-card text-dim hover:text-ink flex flex-col items-center justify-center gap-0.5 text-[12.5px] font-semibold cursor-pointer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
                </svg>
                {said ?? "Share"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <div>
          <HeadingPill small>Titles</HeadingPill>
        </div>
        <div className={SHELL}>
          <ol className="m-0 p-0 list-none grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
            {l.titles.map((t, i) => {
              const done = watched.includes(t.key);
              return (
                <li key={t.key} className="min-w-0">
                  <Link href={t.href} className="group block no-underline text-ink">
                    <span className="relative block aspect-[2/3] rounded-[10px] overflow-hidden bg-card border border-hair group-hover:border-accent transition-colors">
                      {t.poster && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.poster} alt="" loading="lazy" className={`w-full h-full object-cover ${done ? "opacity-60" : ""}`} />
                      )}
                      <span className="absolute left-1.5 top-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-black/60 text-white text-[10.5px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                      {done && (
                        <span title="Watched" className="absolute right-1.5 bottom-1.5 w-6 h-6 rounded-full bg-accent-fill text-on-accent flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        </span>
                      )}
                    </span>
                    <span className="block mt-1.5 text-[12.5px] leading-[16px] truncate group-hover:text-accent transition-colors">{t.title}</span>
                    <span className="block text-[12.5px] leading-[16px] text-dim">
                      {t.year}
                      {t.kind === "show" && " · Series"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <div>
          <HeadingPill small>{comments.length ? `Comments · ${comments.length}` : "Comments"}</HeadingPill>
        </div>
        <div className={SHELL}>
          <div className="rounded-shell bg-piece divide-y divide-hair">
            {comments.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <span className="shrink-0 w-8 h-8 rounded-full bg-accent-fill text-on-accent flex items-center justify-center display text-[15px] leading-none pt-[2px]">{c.who[0].toUpperCase()}</span>
                <div className="min-w-0 text-[12.5px] leading-[1.5]">
                  <Link href={`/u/${c.who}`} className="font-semibold text-ink no-underline hover:text-accent">
                    @{c.who}
                  </Link>
                  <span className="text-dim"> · {c.ago}</span>
                  <p className="m-0 mt-0.5 text-mid-tone">{c.text}</p>
                </div>
                <MoreButton what={{ kind: "comment", target: `${l.owner}/${l.id}#${i}`, author: c.who, href: `/u/${l.owner}/list/${l.id}`, excerpt: c.text.slice(0, 200) }} className="ml-auto shrink-0 -my-1" />
              </div>
            ))}
            <form
              className="p-3 grid gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                post();
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value.slice(0, 1000));
                    setRefused(null);
                  }}
                  aria-invalid={!!refused}
                  placeholder="Add a comment"
                  className={`flex-1 min-w-0 rounded-full bg-card border px-4 py-2 text-[12.5px] text-ink placeholder:text-dim focus:outline-none ${refused ? "border-loved" : "border-hair focus:border-accent"}`}
                />
                <button type="submit" disabled={!draft.trim()} className="h-9 px-4 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default">
                  Post
                </button>
              </div>
              {refused && (
                <p role="alert" className="m-0 px-4 text-[12.5px] text-loved">
                  {refused}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
