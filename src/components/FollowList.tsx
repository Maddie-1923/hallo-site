"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { removeFollower, useSafety } from "@/lib/safety";

export interface FollowPerson {
  username: string;
  displayName: string;
}

// A profile's Followers or Following tile, pressed: the people, each going
// to their profile. On your own Followers, Remove takes someone off the list
// (they aren't told, and can follow again unless you block them). Blocked
// people never show. Until accounts open the people are the sample members.
export function FollowList({ kind, owner, people, className, children }: { kind: "followers" | "following"; owner: boolean; people: FollowPerson[]; className: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { blocked, removedFollowers } = useSafety();
  const shown = people.filter((p) => !blocked.includes(p.username) && !(kind === "followers" && owner && removedFollowers.includes(p.username)));
  const title = kind === "followers" ? "Followers" : "Following";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`See ${title.toLowerCase()}`} className={`${className} cursor-pointer hover:ring-1 hover:ring-inset hover:ring-hair`}>
        {children}
      </button>
      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setOpen(false)}>
            <div className="w-full sm:max-w-[420px] rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
              <div className="rounded-shell bg-piece p-4 grid gap-3">
                <h3 className="!text-[clamp(24px,2.6vw,30px)] !leading-none uppercase">{title}</h3>
                {shown.length ? (
                  <ul className="m-0 p-0 list-none grid gap-1 max-h-[55vh] overflow-y-auto">
                    {shown.map((p) => (
                      <li key={p.username} className="flex items-center justify-between gap-3 py-1.5">
                        <Link href={`/u/${p.username}`} className="flex items-center gap-2 min-w-0 no-underline text-ink group">
                          <span className="w-8 h-8 shrink-0 rounded-full bg-accent-fill text-on-accent flex items-center justify-center display text-[15px] leading-none pt-[2px]">{p.username[0].toUpperCase()}</span>
                          <span className="min-w-0">
                            <span className="block text-[12.5px] font-semibold truncate group-hover:text-accent transition-colors">{p.displayName}</span>
                            <span className="block text-[12.5px] text-dim truncate">@{p.username}</span>
                          </span>
                        </Link>
                        {kind === "followers" && owner && (
                          <button type="button" onClick={() => removeFollower(p.username)} className="h-8 px-4 shrink-0 rounded-full bg-card border border-hair text-[12.5px] font-semibold text-ink cursor-pointer hover:text-loved transition-colors">
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-[12.5px] text-dim">{people.length ? "Nobody here now." : "Follower lists open with accounts."}</p>
                )}
                {kind === "followers" && owner && shown.length > 0 && <p className="m-0 text-[12.5px] leading-[1.5] text-dim">Removing someone doesn&apos;t tell them. To stop them following again, block them.</p>}
                <div className="flex justify-end">
                  <button type="button" onClick={() => setOpen(false)} className="h-9 px-4 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold cursor-pointer">
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
