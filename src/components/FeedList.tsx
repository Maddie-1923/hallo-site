"use client";

import Link from "next/link";
import type { FeedItem } from "@/lib/social-actions";
import { useSafety } from "@/lib/safety";
import { useDateFormat } from "./Day";

// The feed's entries: who, what they did and when, the title's poster, their
// rating, and for a review its words (a spoiler review folded shut) with the
// way to its page, where it can be liked and commented on.
export function FeedList({ items }: { items: FeedItem[] }) {
  const { blocked } = useSafety();
  const fmt = useDateFormat();
  const verb = { review: "reviewed", rating: "rated", loved: "loved", list: "updated the list" } as const;
  return (
    <ul className="m-0 p-0 list-none grid gap-2">
      {items
        .filter((i) => !blocked.includes(i.who.username))
        .map((i) => (
          <li key={i.key} className="rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]">
            <div className="rounded-shell bg-piece p-3 flex gap-3">
              <Link href={i.href} className="w-16 shrink-0 self-start aspect-[2/3] rounded-[8px] overflow-hidden bg-card border border-hair">
                {i.poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
              </Link>
              <div className="min-w-0 flex-1 text-[12.5px] leading-[1.5]">
                <div>
                  <Link href={`/u/${i.who.username}`} className="font-semibold text-ink no-underline hover:text-accent">
                    @{i.who.username}
                  </Link>{" "}
                  <span className="text-dim">{verb[i.kind]}</span>{" "}
                  <Link href={i.href} className="font-semibold text-ink no-underline hover:text-accent">
                    {i.title}
                  </Link>
                </div>
                <div className="text-dim">
                  {i.rating != null && <span className="text-accent">★ {i.rating}</span>}
                  {i.rating != null && " · "}
                  {ago(i.at, fmt)}
                </div>
                {i.text &&
                  (i.spoilers ? (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-dim">Contains spoilers. Show it anyway</summary>
                      <p className="m-0 mt-1 text-mid-tone line-clamp-6">{i.text}</p>
                    </details>
                  ) : (
                    <p className="m-0 mt-1.5 text-mid-tone line-clamp-4">{i.text}</p>
                  ))}
                {i.reviewHref && (
                  <Link href={i.reviewHref} className="inline-block mt-1.5 text-accent font-semibold no-underline hover:underline">
                    Like or comment →
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
    </ul>
  );
}

function ago(at: string, fmt: ReturnType<typeof useDateFormat>) {
  const mins = (Date.now() - Date.parse(at)) / 60_000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h ago`;
  if (mins < 48 * 60) return "Yesterday";
  return fmt(at, "short");
}
