"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { removeFollower, useSafety } from "@/lib/safety";
import { answerFollower, followList } from "@/lib/social-actions";

export interface FollowPerson {
  username: string;
  displayName: string;
}

// A profile's Followers or Following tile, pressed: the people, each going
// to their profile. On your own Followers, Remove takes someone off the list
// (they aren't told, and can follow again unless you block them). Blocked
// people never show. The people come from the account when the list opens, and the owner's Followers also has their requests to
// accept or decline; Remove takes a follower off for real.
export function FollowList({ kind, owner, username, className, children }: { kind: "followers" | "following"; owner: boolean; username?: string; className: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState<{ people: FollowPerson[]; requests: FollowPerson[] } | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  const { blocked, removedFollowers } = useSafety();
  const people = live?.people ?? [];
  const requests = (live?.requests ?? []).filter((p) => !gone.includes(p.username));
  const shown = people.filter((p) => !blocked.includes(p.username) && !gone.includes(p.username) && !(kind === "followers" && owner && removedFollowers.includes(p.username)));
  async function openList() {
    setOpen(true);
    if (!username) return;
    const r = await followList(username, kind).catch(() => null);
    if (r) setLive({ people: r.people.map((p) => ({ username: p.username, displayName: p.displayName })), requests: r.requests.map((p) => ({ username: p.username, displayName: p.displayName })) });
  }
  async function answer(who: string, accept: boolean) {
    const r = await answerFollower(who, accept).catch(() => ({ ok: false }) as { ok: boolean; preview?: boolean });
    if (r.preview) {
      if (!accept) removeFollower(who);
      return;
    }
    if (!r.ok) return;
    setGone((g) => [...g, who]);
    if (accept && live) setLive({ ...live, people: [live.requests.find((p) => p.username === who)!, ...live.people] });
  }
  const title = kind === "followers" ? "Followers" : "Following";
  return (
    <>
      <button type="button" onClick={openList} aria-label={`See ${title.toLowerCase()}`} className={`${className} cursor-pointer hover:ring-1 hover:ring-inset hover:ring-hair`}>
        {children}
      </button>
      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setOpen(false)}>
            <div className="w-full sm:max-w-[35rem] rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
              <div className="rounded-shell bg-piece p-4 grid gap-3">
                <h3 className="!text-[clamp(24px,2.6vw,30px)] !leading-none uppercase">{title}</h3>
                {requests.length > 0 && (
                  <div className="grid gap-1">
                    <div className="text-[0.875rem] font-bold uppercase tracking-[.12em] text-dim">Asking to follow you</div>
                    <ul className="m-0 p-0 list-none grid gap-1">
                      {requests.map((p) => (
                        <li key={p.username} className="flex items-center justify-between gap-2 py-1.5">
                          <Link href={`/u/${p.username}`} className="min-w-0 no-underline text-ink hover:text-accent">
                            <span className="block text-[1.0417rem] font-semibold truncate">{p.displayName}</span>
                            <span className="block text-[1.0417rem] text-dim truncate">@{p.username}</span>
                          </Link>
                          <span className="flex gap-1.5 shrink-0">
                            <button type="button" onClick={() => answer(p.username, true)} className="h-8 px-3.5 rounded-full bg-accent-fill text-on-accent text-[1.0417rem] font-semibold cursor-pointer">
                              Accept
                            </button>
                            <button type="button" onClick={() => answer(p.username, false)} className="h-8 px-3.5 rounded-full bg-card border border-hair text-[1.0417rem] font-semibold text-ink cursor-pointer">
                              Decline
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {shown.length ? (
                  <ul className="m-0 p-0 list-none grid gap-1 max-h-[55vh] overflow-y-auto">
                    {shown.map((p) => (
                      <li key={p.username} className="flex items-center justify-between gap-3 py-1.5">
                        <Link href={`/u/${p.username}`} className="flex items-center gap-2 min-w-0 no-underline text-ink group">
                          <span className="w-8 h-8 shrink-0 rounded-full bg-accent-fill text-on-accent flex items-center justify-center display text-[1.25rem] leading-none pt-[2px]">{p.username[0].toUpperCase()}</span>
                          <span className="min-w-0">
                            <span className="block text-[1.0417rem] font-semibold truncate group-hover:text-accent transition-colors">{p.displayName}</span>
                            <span className="block text-[1.0417rem] text-dim truncate">@{p.username}</span>
                          </span>
                        </Link>
                        {kind === "followers" && owner && (
                          <button type="button" onClick={() => (username ? answer(p.username, false) : removeFollower(p.username))} className="h-8 px-4 shrink-0 rounded-full bg-card border border-hair text-[1.0417rem] font-semibold text-ink cursor-pointer hover:text-loved transition-colors">
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-[1.0417rem] text-dim">{live ? (kind === "followers" ? "No followers yet." : "Not following anyone yet.") : people.length ? "Nobody here now." : "Follower lists open with accounts."}</p>
                )}
                {kind === "followers" && owner && shown.length > 0 && <p className="m-0 text-[1.0417rem] leading-[1.5] text-dim">Removing someone doesn&apos;t tell them. To stop them following again, block them.</p>}
                <div className="flex justify-end">
                  <button type="button" onClick={() => setOpen(false)} className="h-9 px-4 rounded-full bg-accent-fill text-on-accent text-[1.0417rem] font-semibold cursor-pointer">
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
