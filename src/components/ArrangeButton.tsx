"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "./CategoryDialog";
import { saveExploreOrder, type ExploreTab } from "@/lib/account-settings";
import { reorderRails } from "@/lib/saved-rail-actions";

// Explore's Arrange: the tab's rows as a list, each moved up or down with
// its arrows, saved with one button, after which the page redraws in the
// new order. The order is kept per tab with the account; the custom
// categories' own order also goes into the synced archive, so the phone
// lists them the same way.
export function ArrangeButton({ tab, rows }: { tab: ExploreTab; rows: { key: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-[3.1667rem] px-4 rounded-full bg-card border border-hair text-[1.0833rem] font-bold text-dim hover:text-ink cursor-pointer transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M7 4v16M3.5 7.5L7 4l3.5 3.5M17 20V4M13.5 16.5L17 20l3.5-3.5" />
        </svg>
        Arrange
      </button>
      {open && <ArrangeSheet tab={tab} rows={rows} onClose={() => setOpen(false)} />}
    </>
  );
}

function ArrangeSheet({ tab, rows, onClose }: { tab: ExploreTab; rows: { key: string; title: string }[]; onClose: () => void }) {
  const router = useRouter();
  const [list, setList] = useState(rows);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  function move(i: number, by: -1 | 1) {
    setList((l) => {
      const j = i + by;
      if (j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function save() {
    setError(undefined);
    start(async () => {
      const keys = list.map((r) => r.key);
      // The categories' order goes to the synced archive only when there
      // are categories to order, so a built-in-only change doesn't make the
      // phone sync for nothing.
      const mine = keys.filter((k) => k.startsWith("c:")).map((k) => k.slice(2));
      const [ok, r] = await Promise.all([saveExploreOrder(tab, keys), mine.length > 1 ? reorderRails(mine) : Promise.resolve({} as { error?: string })]);
      if (!ok || r.error) {
        setError("That didn't save. Try again.");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  const arrow = "w-9 h-9 rounded-[8px] flex items-center justify-center text-ink hover:bg-piece cursor-pointer disabled:opacity-25 disabled:cursor-default";
  return (
    <Sheet
      label="Arrange rows"
      title="Arrange rows"
      width={480}
      onClose={onClose}
      footer={
        <>
          {error && (
            <span className="text-[1.0833rem] mr-auto" style={{ color: "var(--movies)" }} role="alert">
              {error}
            </span>
          )}
          <button type="button" className="text-[1.1667rem] font-semibold text-dim hover:text-ink cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn !py-2 !px-5 !text-[1.1667rem]" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <p className="m-0 mb-2 text-[1rem] text-dim">Move a row up or down. The page shows them in this order.</p>
      <ol className="m-0 p-0 list-none [&>li+li]:border-t [&>li+li]:border-[color:color-mix(in_srgb,var(--ink)_12%,transparent)]">
        {list.map((r, i) => (
          <li key={r.key} className="flex items-center gap-3 min-h-11 py-1">
            <span className="w-5 text-right text-[1rem] text-dim tabular-nums">{i + 1}</span>
            <span className="flex-1 min-w-0 truncate text-[1.1667rem] text-ink">{r.title}</span>
            <button type="button" className={arrow} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${r.title} up`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 15l6-6 6 6" />
              </svg>
            </button>
            <button type="button" className={arrow} disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${r.title} down`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
