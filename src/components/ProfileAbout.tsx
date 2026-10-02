"use client";

import { useEffect, useState } from "react";
import { checkText } from "@/lib/word-filter";
import { saveAbout } from "@/lib/account-settings";
import { cleanLink, describeLink, MAX_LINKS, type LinkKind } from "@/lib/profile-links";
import { createPortal } from "react-dom";

// Under the name on the profile card: where the person is, with a map pin,
// a line in their own words, in quotation marks, and up to three links of
// their own (lib/profile-links). All theirs to set; none shows, not even
// its mark, when empty. The owner edits them from the card's ••• menu,
// which sends EDIT_ABOUT. The owner sees a quiet "Add your location"
// and "Add a quote" in their place, and a pencil to change them; until
// accounts exist what they write is kept in this browser.
/** The event the card's ••• menu sends to open the editor. */
export const EDIT_ABOUT = "kodigo:edit-about";

export function ProfileAbout({ location, quote, links = [], owner, username }: { location: string | null; quote: string | null; links?: string[]; owner: boolean; username: string }) {
  const key = `kodigo.profile-about.${username}`;
  const [mine, setMine] = useState<{ location: string; quote: string; links?: string[] } | null>(null);
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
  const shownLinks = mine?.links ?? links;
  function save(next: { location: string; quote: string; links: string[] }) {
    setMine(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
    // Signed in, the profile keeps it (nothing happens signed out).
    void saveAbout(next).catch(() => {});
    setEditing(false);
  }

  // The card's ••• menu (ProfileMenu) opens the editor: "Edit about".
  useEffect(() => {
    if (!owner) return;
    const open = () => setEditing(true);
    window.addEventListener(EDIT_ABOUT, open);
    return () => window.removeEventListener(EDIT_ABOUT, open);
  }, [owner]);

  return (
    <div className="mt-2 grid gap-1.5 text-[1.0417rem] leading-[1.4] min-w-0">
      {place && (
        <div className="flex items-center gap-1.5 min-w-0 text-dim">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
            <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          <span className="truncate text-ink">{place}</span>
        </div>
      )}
      {line && <p className="m-0 text-bone italic line-clamp-3">“{line}”</p>}
      {shownLinks.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-wrap gap-x-3 gap-y-1">
          {shownLinks.map((href) => {
            const { kind, label } = describeLink(href);
            return (
              <li key={href} className="min-w-0">
                <a href={href} target="_blank" rel="nofollow ugc noopener noreferrer" className="inline-flex items-center gap-1.5 max-w-full text-dim no-underline hover:text-ink">
                  <LinkMark kind={kind} />
                  <span className="truncate">{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {editing && <AboutSheet location={place} quote={line} links={shownLinks} onSave={save} onClose={() => setEditing(false)} />}
    </div>
  );
}

function AboutSheet({ location, quote, links, onSave, onClose }: { location: string; quote: string; links: string[]; onSave: (v: { location: string; quote: string; links: string[] }) => void; onClose: () => void }) {
  const [place, setPlace] = useState(location);
  const [line, setLine] = useState(quote);
  const [urls, setUrls] = useState<string[]>(() => Array.from({ length: MAX_LINKS }, (_, i) => links[i] ?? ""));
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (k: KeyboardEvent) => k.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const field = "w-full rounded-[12px] bg-card-hi border border-hair px-3 py-2 text-[1.1667rem] text-ink placeholder:text-dim focus:outline-none focus:border-accent";
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="About you" className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <form
        className="w-full sm:max-w-[40rem] rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl p-4 grid gap-3"
        onClick={(x) => x.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          const cleaned = urls.filter((u) => u.trim()).map((u) => cleanLink(u));
          const p = cleaned.includes(null) ? "One of those links isn't a web address." : checkText(`${place}\n${line}\n${cleaned.join("\n")}`);
          setProblem(p);
          if (!p) onSave({ location: place.trim(), quote: line.trim(), links: cleaned as string[] });
        }}
      >
        <h3 className="!text-[clamp(26px,3vw,34px)] !leading-[.95]">About you</h3>
        <label className="grid gap-1.5 text-[1.0417rem] text-dim">
          Location
          <input autoFocus value={place} onChange={(e) => setPlace(e.target.value)} placeholder="San Francisco, CA" maxLength={60} className={field} />
        </label>
        <label className="grid gap-1.5 text-[1.0417rem] text-dim">
          Quote
          <textarea value={line} onChange={(e) => setLine(e.target.value)} placeholder="A line about you, or one you love" maxLength={210} rows={3} className={`${field} resize-none`} />
        </label>
        <fieldset className="m-0 p-0 border-0 grid gap-1.5 text-[1.0417rem] text-dim">
          <legend className="mb-1.5">Links</legend>
          {urls.map((u, i) => (
            <input key={i} value={u} onChange={(e) => setUrls((all) => all.map((x, j) => (j === i ? e.target.value : x)))} placeholder={["youtube.com/@you", "x.com/you", "yourwebsite.com"][i]} inputMode="url" autoCapitalize="off" spellCheck={false} maxLength={200} aria-label={`Link ${i + 1}`} className={field} />
          ))}
        </fieldset>
        {problem && (
          <p role="alert" className="m-0 text-[1.0417rem] text-loved">
            {problem}
          </p>
        )}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-full text-[1.0833rem] text-dim hover:text-ink cursor-pointer">
            Cancel
          </button>
          <button type="submit" className="h-9 px-5 rounded-full bg-accent-fill text-on-accent text-[1.0833rem] font-semibold cursor-pointer">
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

// A link's mark: the service's initial shape where it's one people know, a
// globe for anything else. Drawn as simple glyphs on currentColor, not the
// services' own logos.
function LinkMark({ kind }: { kind: LinkKind }) {
  const common = { width: 13, height: 13, viewBox: "0 0 24 24", "aria-hidden": true, className: "shrink-0" } as const;
  if (kind === "youtube")
    return (
      <svg {...common} fill="currentColor">
        <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9C2 8.9 2 12 2 12s0 3.1.4 4.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8zM10 15.1V8.9l5.2 3.1L10 15.1z" />
      </svg>
    );
  if (kind === "x")
    return (
      <svg {...common} fill="currentColor">
        <path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />
      </svg>
    );
  if (kind === "instagram")
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  if (kind === "letterboxd")
    return (
      <svg {...common} fill="currentColor">
        <circle cx="5" cy="12" r="3.5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="19" cy="12" r="3.5" />
      </svg>
    );
  if (kind === "tiktok")
    return (
      <svg {...common} fill="currentColor">
        <path d="M16.5 3c.4 2.2 1.8 3.7 4 4v3.1c-1.5 0-2.9-.4-4-1.2v6.3a6 6 0 1 1-6-6h.6v3.2a2.9 2.9 0 1 0 2.3 2.8V3h3.1z" />
      </svg>
    );
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </svg>
  );
}
