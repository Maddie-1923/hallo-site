import Link from "next/link";
import type { ListView } from "@/lib/lists";

// A list as a card: whose it is first, their photo beside the list's name,
// how many titles and how many likes; then its first posters side by side,
// all one size, with the last place telling how many more there are.
const SHOWN = 4;

export function ListCard({ l }: { l: ListView }) {
  // Five fit whole; past five, four and the count of the rest.
  const more = l.titles.length > SHOWN + 1 ? l.titles.length - SHOWN : 0;
  const posters = l.titles.slice(0, more ? SHOWN : SHOWN + 1);
  return (
    <Link href={`/u/${l.owner}/list/${l.id}`} className="group grid gap-2.5 rounded-shell bg-piece p-3 no-underline text-ink min-w-0">
      <span className="flex items-center gap-2.5 min-w-0">
        <span className="shrink-0 w-[3.3333rem] h-[3.3333rem] rounded-full overflow-hidden bg-accent-fill text-on-accent flex items-center justify-center display text-[1.5rem] leading-none" aria-hidden>
          {l.ownerAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.ownerAvatar} alt="" className="w-full h-full object-cover object-top" />
          ) : (
            <span className="translate-y-[1px]">{l.owner[0]?.toUpperCase()}</span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-[1.0417rem] font-semibold truncate group-hover:text-accent transition-colors">{l.name}</span>
          <span className="block text-[1rem] text-dim truncate">
            @{l.owner} · {l.titles.length} {l.titles.length === 1 ? "title" : "titles"}
            {l.likes > 0 && <> · ♥ {l.likes}</>}
          </span>
        </span>
      </span>
      <span className="grid grid-cols-5 gap-1.5">
        {posters.map((t) => (
          <span key={t.key} className="block aspect-[2/3] rounded-[6px] overflow-hidden bg-card border border-hair transition-transform duration-200 group-hover:-translate-y-0.5">
            {t.poster && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.poster} alt="" loading="lazy" className="w-full h-full object-cover" />
            )}
          </span>
        ))}
        {more > 0 && (
          <span className="flex items-center justify-center aspect-[2/3] rounded-[6px] bg-card border border-hair text-[1.0833rem] font-semibold text-dim tabular-nums">+{more}</span>
        )}
      </span>
    </Link>
  );
}
