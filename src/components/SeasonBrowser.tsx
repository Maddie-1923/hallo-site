"use client";

import Link from "next/link";
import { useState } from "react";
import type { SeasonEpisode } from "@/lib/title-actions";
import { ExpandableText } from "./ExpandableText";
import { SeasonList } from "./SeasonList";
import { HeadingPill, SectionCard } from "./TitleParts";

// All episodes on a show's page, with a small episode page beside the list:
// pressing an episode shows its still, its name and code, when it aired, how
// long it runs, its rating, who directed it and what happens, and the way on
// to its own page. It opens on the episode they watched last, or the
// first. It stays at the top beside the list, where it starts. On a phone
// it comes under the list.
export function SeasonBrowser({ showID, seasons, watched, open, start }: { showID: number; seasons: { number: number; name: string; count: number }[]; watched: string[]; open: number; start: { season: number; episode: number } }) {
  const [ep, setEp] = useState<SeasonEpisode | null>(null);
  const key = ep ? `${showID}-${ep.season}-${ep.episode}` : null;
  return (
    <div className="grid gap-8 lg:gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* The list as tall as the episode beside it (on a phone, a fixed
          height), its seasons scrolling inside. */}
      <section className="flex flex-col gap-2 min-w-0">
        <div>
          <HeadingPill small>All episodes</HeadingPill>
        </div>
        <SectionCard className="relative flex-1 max-lg:h-[520px] lg:min-h-[320px]">
          <SeasonList showID={showID} seasons={seasons} watched={watched} open={open} picked={key} onPick={setEp} start={start} scroll />
        </SectionCard>
      </section>
      {/* The notch's 8px from the list, as the keys are from About above. */}
      <section className="lg:pl-2 grid grid-cols-[minmax(0,1fr)] gap-2 content-start min-w-0">
        <div>
          <HeadingPill small>{ep ? code(ep.season, ep.episode) : "Episode"}</HeadingPill>
        </div>
        <SectionCard>
          {ep ? (
            <div className="grid gap-2">
              {ep.still && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ep.still} alt="" className="w-full aspect-video object-cover rounded-[8px] bg-piece" />
              )}
              <div className="rounded-shell bg-piece p-3">
                <div className="display text-[22px] leading-none tracking-[.03em] uppercase">{ep.name}</div>
                <div className="mt-2.5 border-t border-hair">
                  {[
                    ep.airDate && ["Aired", longDate(ep.airDate)],
                    ep.runtime && ["Runtime", `${ep.runtime}m`],
                    ep.vote && ["TMDB", ep.vote.toFixed(1)],
                  ]
                    .filter(Boolean)
                    .map((f, i, all) => (
                      <div key={(f as string[])[0]} className={`flex items-baseline justify-between gap-4 py-[8px] text-[12.5px] ${i < all.length - 1 || ep.directors.length ? "border-b border-hair" : ""}`}>
                        <span className="text-dim">{(f as string[])[0]}</span>
                        <span className="text-ink">{(f as string[])[1]}</span>
                      </div>
                    ))}
                  {ep.directors.length > 0 && (
                    <div className="flex items-baseline justify-between gap-4 py-[8px] text-[12.5px]">
                      <span className="text-dim">{ep.directors.length > 1 ? "Directors" : "Director"}</span>
                      <span className="text-right">
                        {ep.directors.map((d, i) => (
                          <span key={d.id}>
                            {i > 0 && " · "}
                            <Link href={`/person/${d.id}`} className="text-accent no-underline hover:underline">
                              {d.name}
                            </Link>
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                </div>
                {ep.overview && (
                  <div className="mt-[1px] pt-[9px] border-t border-hair">
                    <ExpandableText text={ep.overview} />
                  </div>
                )}
              </div>
              <Link href={`/show/${showID}/season/${ep.season}/episode/${ep.episode}`} className="rounded-shell bg-piece p-3 flex items-center justify-between text-[12.5px] font-semibold text-ink no-underline hover:text-accent transition-colors">
                Open the episode&apos;s page
                <span aria-hidden className="text-accent">→</span>
              </Link>
            </div>
          ) : (
            <p className="m-0 rounded-shell bg-piece p-3 text-[12.5px] text-dim">Pick an episode in the list to see it here.</p>
          )}
        </SectionCard>
      </section>
    </div>
  );
}

function code(s: number, e: number) {
  const ep = String(e).padStart(2, "0");
  return s === 0 ? `SP | ${ep}` : `S${String(s).padStart(2, "0")} | E${ep}`;
}

function longDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
