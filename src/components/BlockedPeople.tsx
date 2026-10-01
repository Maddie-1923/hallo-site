"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { unblock, useSafety } from "@/lib/safety";

// Settings → Privacy → Blocked people: how many, and a sheet listing them
// with Unblock beside each.
export function BlockedPeople() {
  const { blocked } = useSafety();
  const [open, setOpen] = useState(false);
  if (!blocked.length) return <span className="text-[1.0417rem] text-dim">Nobody</span>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="h-8 px-4 rounded-full bg-card border border-hair text-[1.0417rem] font-semibold text-ink cursor-pointer hover:text-accent transition-colors">
        {blocked.length} blocked
      </button>
      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label="Blocked people" className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setOpen(false)}>
            <div className="w-full sm:max-w-[35rem] rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
              <div className="rounded-shell bg-piece p-4 grid gap-3">
                <h3 className="!text-[clamp(24px,2.6vw,30px)] !leading-none uppercase">Blocked people</h3>
                {blocked.length ? (
                  <ul className="m-0 p-0 list-none grid gap-1 max-h-[50vh] overflow-y-auto">
                    {blocked.map((u) => (
                      <li key={u} className="flex items-center justify-between gap-3 py-1.5">
                        <Link href={`/u/${u}`} className="flex items-center gap-2 min-w-0 no-underline text-ink hover:text-accent">
                          <span className="w-8 h-8 shrink-0 rounded-full bg-accent-fill text-on-accent flex items-center justify-center display text-[1.25rem] leading-none pt-[2px]">{u[0].toUpperCase()}</span>
                          <span className="text-[1.0417rem] font-semibold truncate">@{u}</span>
                        </Link>
                        <button type="button" onClick={() => unblock(u)} className="h-8 px-4 rounded-full bg-card border border-hair text-[1.0417rem] font-semibold text-ink cursor-pointer hover:text-accent transition-colors">
                          Unblock
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-[1.0417rem] text-dim">Nobody. Everyone you blocked has been unblocked.</p>
                )}
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
