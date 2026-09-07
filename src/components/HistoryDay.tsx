import Link from "next/link";
import { poster } from "@/lib/archive";
import type { DiaryEntry } from "@/lib/diary";
import { MOODS } from "@/lib/moods";
import { TightHeart } from "./marks";

// One day of the history, as a card of tiles. The poster anchors it, the
// title and what you watched sit beside it, and the rating, the moods and
// the review fill the rest. A day with nothing said still draws its tiles —
// dimmed, naming what could go there — so the shape of the page doesn't
// change depending on how much somebody wrote.
export function HistoryDay({ entries }: { entries: DiaryEntry[] }) {
  return (
    <div className="rounded-2xl bg-card p-3 grid gap-3">
      {entries.map((e) => (
        <Entry key={e.key} e={e} />
      ))}
    </div>
  );
}

function Entry({ e }: { e: DiaryEntry }) {
  const src = poster(e.poster, "w342");
  const tile = "rounded-xl bg-card-hi/70 px-3 py-2.5 flex flex-col justify-center gap-1 min-w-0 overflow-hidden";
  const ghost = "rounded-xl border border-dashed border-hair px-3 py-2.5 flex items-center text-xs text-dim";
  const moods = MOODS.filter((m) => e.moods.includes(m.id));

  return (
    <div className="grid gap-2 [grid-template-columns:repeat(12,1fr)] [grid-auto-rows:46px]">
      <Link href={e.href} className="col-span-3 sm:col-span-2 row-span-3 rounded-xl overflow-hidden bg-card-hi no-underline">
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
        )}
      </Link>

      <div className={`${tile} col-span-9 sm:col-span-6 row-span-2`}>
        {e.context && <div className="text-[10px] tracking-[.14em] uppercase text-dim truncate">{e.context}</div>}
        <div className="text-[15px] font-bold leading-tight truncate">{e.name}</div>
        <div className="text-xs text-dim truncate">
          {e.kind === "episode" ? "Episode" : "Film"}
          {e.released && ` · ${e.released}`}
          {e.rewatch && " · rewatch"}
        </div>
      </div>

      <div className={`${e.rating === null ? ghost : tile} col-span-6 sm:col-span-4 row-span-2`}>
        {e.rating === null ? (
          "Rate it"
        ) : (
          <>
            <span className="flex">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const lit = e.rating! >= n - 0.5;
                const half = lit && e.rating! < n;
                return (
                  <span
                    key={n}
                    className="relative inline-flex"
                    style={{ width: 13, color: lit && !half ? "var(--loved)" : "color-mix(in srgb, var(--ink) 22%, transparent)" }}
                  >
                    <TightHeart size={12} />
                    {half && (
                      <span className="absolute inset-0" style={{ color: "var(--loved)", clipPath: "inset(0 50% 0 0)" }}>
                        <TightHeart size={12} />
                      </span>
                    )}
                  </span>
                );
              })}
            </span>
            <span className="text-xs text-dim">{e.rating} hearts</span>
          </>
        )}
      </div>

      <div className={`${moods.length === 0 ? ghost : tile} col-span-6 sm:col-span-4`}>
        {moods.length === 0 ? (
          "Add a mood"
        ) : (
          <span className="flex flex-wrap gap-1.5">
            {moods.map((m) => (
              <span key={m.id} className="text-[11px] rounded-full border border-hair px-2 py-0.5">
                <span aria-hidden>{m.emoji}</span> {m.label}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className={`${e.review ? tile : ghost} col-span-12 sm:col-span-10 row-span-2`}>
        {e.review ? (
          <p className="text-sm leading-relaxed text-bone m-0 line-clamp-3">
            {e.spoilers && <span className="text-dim">Spoilers · </span>}
            {e.review}
          </p>
        ) : (
          "Write a note about this one"
        )}
      </div>
    </div>
  );
}
