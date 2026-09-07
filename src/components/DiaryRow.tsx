import Link from "next/link";
import type { DiaryEntry } from "@/lib/diary";
import { weekday } from "@/lib/diary";
import { poster } from "@/lib/archive";
import { MarkHeart, MarkRewatched, TightHeart } from "./marks";

// One catalogue entry as a card of small tiles: Letterboxd's diary columns,
// kept in their order, drawn as a bento row. Lit tiles use the app's loved
// and seen colours; an empty tile goes dim and says what you can do, so a
// bare entry never looks broken.
export function DiaryRow({ e }: { e: DiaryEntry }) {
  const src = poster(e.poster, "w185");
  const cell = "rounded-xl bg-card-hi/60 min-h-[44px] flex items-center justify-center text-xs text-dim px-2";
  const empty = "text-ink/25";
  return (
    <Link
      href={e.href}
      className="grid items-center gap-2 rounded-2xl border border-hair bg-card px-3 py-2.5 no-underline text-ink hover:border-ink transition-colors [grid-template-columns:56px_40px_minmax(0,1fr)_56px_136px_44px_44px_minmax(120px,220px)_40px]"
    >
      <div className={`${cell} flex-col leading-none py-1.5`}>
        <span className="text-xl font-semibold text-ink">{e.day.slice(8, 10)}</span>
        <span className="text-[10px] tracking-[.1em] uppercase mt-1">{weekday(e.day)}</span>
      </div>
      <div className="aspect-[2/3] w-10 rounded-md overflow-hidden bg-card-hi">
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="min-w-0 pl-1">
        {e.context && <div className="text-[10px] tracking-[.12em] uppercase text-dim truncate">{e.context}</div>}
        <div className="text-[15px] font-semibold truncate" title={e.name}>
          {e.name}
        </div>
      </div>
      <div className={cell}>{e.released || "—"}</div>
      <div className={cell}>
        {e.rating === null ? (
          <span className={empty}>Rate it</span>
        ) : (
          <span className="flex" aria-label={`${e.rating} out of 10`}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const lit = e.rating! >= n - 0.5;
              const half = lit && e.rating! < n;
              return (
                <span key={n} className="relative inline-flex" style={{ width: 12, color: lit && !half ? "var(--loved)" : "color-mix(in srgb, var(--ink) 22%, transparent)" }}>
                  <TightHeart size={11} />
                  {half && (
                    <span className="absolute inset-0" style={{ color: "var(--loved)", clipPath: "inset(0 50% 0 0)" }}>
                      <TightHeart size={11} />
                    </span>
                  )}
                </span>
              );
            })}
          </span>
        )}
      </div>
      <div className={cell} style={{ color: e.loved ? "var(--loved)" : undefined }} title={e.loved ? "Loved" : "Not a favorite"}>
        <span className={e.loved ? "" : empty}>
          <MarkHeart size={22} />
        </span>
      </div>
      <div className={cell} style={{ color: e.rewatch ? "var(--accent)" : undefined }} title={e.rewatch ? "Rewatch" : "First watch"}>
        <span className={e.rewatch ? "" : empty}>
          <MarkRewatched size={22} />
        </span>
      </div>
      <div className={`${cell} justify-start text-left`}>
        {e.review ? (
          <span className="truncate text-ink/80" title={e.spoilers ? "Contains spoilers" : undefined}>
            {e.spoilers ? "Spoilers · " : ""}
            {e.review}
          </span>
        ) : (
          <span className={empty}>Write it up</span>
        )}
      </div>
      <div className={`${cell} text-base`} aria-hidden>
        ✎
      </div>
    </Link>
  );
}
