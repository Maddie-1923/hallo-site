"use client";

import { useEffect, useState } from "react";
import { checkText } from "@/lib/word-filter";
import { createPortal } from "react-dom";

// Under the handle on the profile card: where the person is, with a map pin,
// and a line in their own words, in quotation marks. Both are theirs to set
// and neither shows when empty. The owner sees a quiet "Add your location"
// and "Add a quote" in their place, and a pencil to change them; until
// accounts exist what they write is kept in this browser.
export function ProfileAbout({ location, quote, owner, username }: { location: string | null; quote: string | null; owner: boolean; username: string }) {
  const key = `kodigo.profile-about.${username}`;
  const [mine, setMine] = useState<{ location: string; quote: string } | null>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!owner) return;
    try {
      const saved = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setMine(JSON.parse(saved));
    } catch {}
  }, [owner, key]);
  const place = (mine ? mine.location : location) || "";
  const line = (mine ? mine.quote : quote) || "";
  function save(next: { location: string; quote: string }) {
    setMine(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
    setEditing(false);
  }

  const add = "text-dim hover:text-ink cursor-pointer";
  return (
    <div className="mt-2 grid gap-1.5 text-[12.5px] leading-[1.4] min-w-0">
      {(place || owner) && (
        <div className="flex items-center gap-1.5 min-w-0 text-dim">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
            <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          {place ? (
            <span className="truncate text-ink">{place}</span>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className={add}>
              Add your location
            </button>
          )}
          {owner && place && <EditButton onClick={() => setEditing(true)} />}
        </div>
      )}
      {line ? (
        <p className="m-0 text-bone italic line-clamp-2">
          “{line}”{owner && !place && <EditButton onClick={() => setEditing(true)} />}
        </p>
      ) : (
        owner && (
          <button type="button" onClick={() => setEditing(true)} className={`${add} text-left`}>
            Add a quote
          </button>
        )
      )}
      {editing && <AboutSheet location={place} quote={line} onSave={save} onClose={() => setEditing(false)} />}
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Edit your location and quote" title="Edit" className="inline-flex align-middle ml-1.5 text-dim hover:text-ink cursor-pointer not-italic">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
      </svg>
    </button>
  );
}

function AboutSheet({ location, quote, onSave, onClose }: { location: string; quote: string; onSave: (v: { location: string; quote: string }) => void; onClose: () => void }) {
  const [place, setPlace] = useState(location);
  const [line, setLine] = useState(quote);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (k: KeyboardEvent) => k.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const field = "w-full rounded-[12px] bg-card-hi border border-hair px-3 py-2 text-[14px] text-ink placeholder:text-dim focus:outline-none focus:border-accent";
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="About you" className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <form
        className="w-full sm:max-w-[480px] rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl p-4 grid gap-3"
        onClick={(x) => x.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          const p = checkText(`${place}\n${line}`);
          setProblem(p);
          if (!p) onSave({ location: place.trim(), quote: line.trim() });
        }}
      >
        <h3 className="!text-[clamp(26px,3vw,34px)] !leading-[.95]">About you</h3>
        <label className="grid gap-1.5 text-[12.5px] text-dim">
          Location
          <input autoFocus value={place} onChange={(e) => setPlace(e.target.value)} placeholder="San Francisco, CA" maxLength={60} className={field} />
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-dim">
          Quote
          <textarea value={line} onChange={(e) => setLine(e.target.value)} placeholder="A line about you, or one you love" maxLength={140} rows={2} className={`${field} resize-none`} />
        </label>
        {problem && (
          <p role="alert" className="m-0 text-[12.5px] text-loved">
            {problem}
          </p>
        )}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-full text-[13px] text-dim hover:text-ink cursor-pointer">
            Cancel
          </button>
          <button type="submit" className="h-9 px-5 rounded-full bg-accent-fill text-on-accent text-[13px] font-semibold cursor-pointer">
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
