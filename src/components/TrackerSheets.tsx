"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sheet } from "./CategoryDialog";
import { TrailerModal } from "./TrailerPlayer";
import { trailerFor } from "@/lib/trailer-actions";
import { loadSeason, type SeasonEpisode } from "@/lib/title-actions";
import { code } from "./TrackerRow";
import type { ProfileTitle } from "@/lib/public-profile";

// The tracker's More and Recap, which had keys and nothing behind them.

const ROW = "flex items-center justify-between w-full min-h-11 px-1 text-left text-[14px] text-ink no-underline cursor-pointer hover:text-accent";
const LIST = "[&>*+*]:border-t [&>*+*]:border-[color:color-mix(in_srgb,var(--ink)_12%,transparent)]";

/** More: open the title's page, play its trailer over the page, or see
    where to watch it. */
export function TrackerMore({ t, onClose }: { t: ProfileTitle; onClose: () => void }) {
  const [trailer, setTrailer] = useState<string | null>(null);
  const [finding, setFinding] = useState<"idle" | "finding" | "none">("idle");
  const id = Number(t.key.slice(1));
  const kind = t.kind === "movie" ? "movie" : "show";
  if (trailer) return <TrailerModal id={trailer} onClose={onClose} />;
  return (
    <Sheet label={t.title} title={t.title} width={420} onClose={onClose} footer={<button type="button" className="text-[14px] font-semibold text-dim hover:text-ink cursor-pointer" onClick={onClose}>Close</button>}>
      <div className={LIST}>
        <Link href={t.href} className={ROW} onClick={onClose}>
          Open the {kind === "movie" ? "film" : "show"}&apos;s page <span aria-hidden>→</span>
        </Link>
        <button
          type="button"
          className={ROW}
          disabled={finding !== "idle"}
          onClick={() => {
            setFinding("finding");
            trailerFor(kind, id)
              .then((v) => (v ? setTrailer(v) : setFinding("none")))
              .catch(() => setFinding("none"));
          }}
        >
          {finding === "finding" ? "Finding the trailer…" : finding === "none" ? "No trailer for this one" : "Watch trailer"} <span aria-hidden>▶</span>
        </button>
        <a href={`https://www.themoviedb.org/${kind === "movie" ? "movie" : "tv"}/${id}/watch`} target="_blank" rel="noopener" className={ROW} onClick={onClose}>
          Where to watch <span aria-hidden>↗</span>
        </a>
      </div>
    </Sheet>
  );
}

/** Recap: the synopsis of the episode before the next one, the app's
    "where you left off". If that episode hasn't been watched, its summary
    could spoil it, so it's only shown once asked for. */
export function TrackerRecap({ t, episode, watched, onClose }: { t: ProfileTitle; episode: string; watched: boolean; onClose: () => void }) {
  const [sn, en] = episode.split("-").map(Number);
  const [ep, setEp] = useState<SeasonEpisode | null | undefined>(undefined);
  const [reveal, setReveal] = useState(watched);
  useEffect(() => {
    let live = true;
    loadSeason(Number(t.key.slice(1)), sn)
      .then((eps) => live && setEp(eps.find((e) => e.episode === en) ?? null))
      .catch(() => live && setEp(null));
    return () => {
      live = false;
    };
  }, [t.key, sn, en]);
  return (
    <Sheet label={`Recap of ${t.title}`} title={`${t.title} · Recap`} width={520} onClose={onClose} footer={<button type="button" className="text-[14px] font-semibold text-dim hover:text-ink cursor-pointer" onClick={onClose}>Close</button>}>
      <div className="text-[12px] font-semibold text-dim">{watched ? "Last time" : "The episode before"} · {code(episode)}</div>
      {ep === undefined ? (
        <p className="m-0 mt-2 text-[14px] text-dim">Loading…</p>
      ) : !ep || !ep.overview ? (
        <p className="m-0 mt-2 text-[14px] text-dim">TMDB has no summary for this episode.</p>
      ) : reveal ? (
        <>
          {ep.still && (
            // The episode's own still, as the episode panel shows it.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ep.still} alt="" className="mt-2 w-full aspect-video object-cover rounded-[12px] bg-piece" />
          )}
          <div className="mt-3 text-[16px] font-semibold text-ink">{ep.name}</div>
          <p className="m-0 mt-2 text-[14px] leading-[1.55] text-ink">{ep.overview}</p>
        </>
      ) : (
        <div className="mt-2">
          <p className="m-0 text-[14px] leading-[1.55] text-ink">You haven&apos;t watched this one yet, so its summary may give things away.</p>
          <button type="button" className="btn !py-2 !px-5 !text-[14px] mt-3" onClick={() => setReveal(true)}>
            Show it anyway
          </button>
        </div>
      )}
    </Sheet>
  );
}

/** The aired episode before `next`, by the show's season lengths. */
export function episodeBefore(aired: number[] | null | undefined, next: string): string | null {
  const all: string[] = [];
  (aired ?? []).forEach((n, i) => {
    for (let e = 1; e <= n; e++) all.push(`${i + 1}-${e}`);
  });
  const at = all.indexOf(next);
  return at > 0 ? all[at - 1] : null;
}
