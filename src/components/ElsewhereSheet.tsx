"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { WhereToWatch } from "@/lib/tmdb";

// "Also streaming in", as the app has it: the accent arrow at the end of
// Where to watch's first row, there only when other countries carry the
// title on services this country doesn't, and the list it opens: each
// service's badge and name, then the countries that have it as small
// outlined chips (the country's name on hover), ruled between the rows,
// sorted by name because a reader is scanning for a service they have.
// The app pushes a page; the web opens a sheet over this one.
export function ElsewhereSheet({ entries }: { entries: WhereToWatch["elsewhere"] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (k: KeyboardEvent) => k.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);
  if (entries.length === 0) return null;
  const names = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Also streaming in other countries: ${entries.length} services`}
        title="Also streaming in"
        className="shrink-0 w-10 h-10 flex items-center justify-center text-accent cursor-pointer hover:brightness-125"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label="Also streaming in" className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setOpen(false)}>
            <div className="w-full sm:max-w-[560px] max-h-[88vh] flex flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] bg-card border border-hair shadow-2xl" onClick={(x) => x.stopPropagation()}>
              <div className="p-4 flex items-center justify-between gap-3 border-b border-hair">
                <h3 className="!text-[clamp(24px,2.6vw,30px)] !leading-none uppercase">Also streaming in</h3>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" autoFocus className="shrink-0 w-9 h-9 rounded-full bg-card-hi hover:bg-hair text-ink flex items-center justify-center cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="block">
                    <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="soft-scroll overflow-y-auto p-4">
                {entries.map((e, i) => (
                  <div key={e.provider.id} className={`flex items-start gap-3 py-4 ${i > 0 ? "border-t border-hair" : "pt-0"}`}>
                    <span className="shrink-0 w-10 h-10 rounded-[8px] overflow-hidden border border-hair bg-piece">
                      {e.provider.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.provider.logo} alt="" className="w-full h-full object-cover" />
                      )}
                    </span>
                    <div className="min-w-0 grid gap-1.5">
                      <div className="text-[15px] font-semibold text-ink">{e.provider.name}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {e.countries.map((c) => (
                          <span key={c} title={names?.of(c) ?? c} className="rounded-[6px] border border-hair px-2 py-[3px] text-[12px] leading-none text-ink">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-hair text-[11px] text-dim">Streaming data by JustWatch</div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
