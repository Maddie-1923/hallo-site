"use client";

import { useEffect, useState } from "react";
import type { ProfileTitle } from "@/lib/public-profile";
import { readTakes, saveTake } from "@/lib/local-takes";

// The person's own take on a title, as the app's "Your take". Its cards, as the app draws them (kodigoTakeCard): the
// rating, ten stars in half steps; how it made them feel, up to three of the
// app's twelve moods; tags; the review itself, with spoilers, the day they
// watched and whether it was a rewatch; the note, which stays private; and
// tags last.
//
// Saving from the website opens with accounts; until then everything here
// can be tried on the page and the Save button says so.
const MOODS = [
  ["❤️", "Loved it"],
  ["😡", "Hated it"],
  ["🙂", "Liked it"],
  ["😭", "Sad"],
  ["🫣", "On Edge"],
  ["🥱", "Boring"],
  ["😤", "Frustrated"],
  ["😞", "Let down"],
  ["❤️‍🔥", "Hot"],
  ["🤯", "Shocked"],
  ["😱", "Scared"],
  ["🙃", "Confused"],
] as const;

export function YourReview({ kind, title }: { kind: "movie" | "show"; title: ProfileTitle }) {
  const [rating, setRating] = useState<number | null>(null);
  const [moods, setMoods] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [spoilers, setSpoilers] = useState(false);
  const [watchedOn, setWatchedOn] = useState("");
  const [rewatch, setRewatch] = useState(false);
  const [note, setNote] = useState("");
  const [said, setSaid] = useState(false);

  // What they saved here before, from this browser.
  useEffect(() => {
    const k = readTakes()[title.key];
    if (!k) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setRating(k.rating);
    setMoods(k.moods);
    setTags(k.tags);
    setText(k.text);
    setSpoilers(k.spoilers);
    setRewatch(k.rewatch);
    setWatchedOn(k.date);
    setNote(k.note);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [title.key]);

  function save() {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    saveTake({ t: title, date: watchedOn || today, rating, text, spoilers, rewatch, moods, tags, note });
    setSaid(true);
  }

  const card = "rounded-[14px] bg-piece p-3 grid gap-2.5";
  const heading = "text-[13.5px] font-semibold text-ink";
  const field = "w-full rounded-[12px] bg-card border border-hair px-3 py-2 text-[12.5px] leading-[1.6] text-ink placeholder:text-dim focus:outline-none focus:border-accent";
  const what = kind === "movie" ? "movie" : "show";

  return (
    <div className="grid gap-2">
      {/* The rating: ten stars, a press on a star's left half sets the half. */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <span className={heading}>Rate this {what}</span>
          {rating != null && (
            <button type="button" onClick={() => setRating(null)} className="text-[12.5px] font-semibold text-ink cursor-pointer">
              Clear
            </button>
          )}
        </div>
        {/* Close together, as the ratings read elsewhere on the site, rather
            than spread across the card. */}
        <div className="flex gap-0.5">
          {Array.from({ length: 10 }, (_, i) => {
            const fill = rating == null ? 0 : Math.max(0, Math.min(1, rating - i));
            return (
              <span key={i} className="relative h-9 w-[24px] flex items-center justify-center">
                <Star fill={fill} />
                <button type="button" aria-label={`${i + 0.5} out of 10`} onClick={() => setRating(i + 0.5)} className="absolute inset-y-0 left-0 w-1/2 cursor-pointer" />
                <button type="button" aria-label={`${i + 1} out of 10`} onClick={() => setRating(i + 1)} className="absolute inset-y-0 right-0 w-1/2 cursor-pointer" />
              </span>
            );
          })}
        </div>
        <div className="text-[12px] text-dim -mt-1">{rating != null ? `${rating} out of 10` : "Not rated yet"}</div>
      </div>

      {/* How it made them feel: the app's twelve moods, up to three. */}
      <div className={card}>
        <div>
          <div className={heading}>How did it make you feel?</div>
          <div className="mt-0.5 text-[12px] text-dim">Pick up to 3</div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-[7px]">
          {MOODS.map(([emoji, label]) => {
            const on = moods.includes(label);
            const full = !on && moods.length >= 3;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                disabled={full}
                onClick={() => setMoods((m) => (on ? m.filter((x) => x !== label) : [...m, label]))}
                className={`h-[54px] rounded-[12px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${on ? "bg-accent-fill text-on-accent font-semibold" : "bg-[color:var(--quiet)] text-dim"} ${full ? "opacity-50 cursor-default" : ""}`}
              >
                <span className="text-[18px] leading-none">{emoji}</span>
                <span className="text-[10px] leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The review itself: what everyone else reads. */}
      <div className={card}>
        <div className={heading}>Your review</div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={`What did you think of this ${what}?`} className={`${field} resize-y min-h-[96px]`} />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-ink">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} className="accent-[var(--accent-fill)]" />
            Contains spoilers
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} className="accent-[var(--accent-fill)]" />
            I&apos;ve watched this before
          </label>
          <label className="inline-flex items-center gap-2">
            <span className="text-dim">Watched on</span>
            <input type="date" value={watchedOn} onChange={(e) => setWatchedOn(e.target.value)} className="rounded-[10px] bg-card border border-hair px-2 py-1 text-[13px] text-ink" />
          </label>
        </div>
      </div>

      {/* The note: the app's private one, never shown to anyone else. */}
      <div className="rounded-[14px] bg-piece p-3 flex items-start gap-2.5">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-[3px] shrink-0 text-dim">
          <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
        </svg>
        <div className="min-w-0 flex-1">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={1} placeholder={`Note on this ${what}`} className="w-full bg-transparent text-[12.5px] leading-[1.6] text-ink placeholder:text-dim resize-none focus:outline-none [field-sizing:content] max-h-[9lh]" />
          <div className="text-[11px] text-dim">Only you can see your note.</div>
        </div>
      </div>

      {/* Tags: chips, and a dashed one to add another. */}
      <div className={card}>
        <div className={heading}>Tags</div>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button key={t} type="button" onClick={() => setTags((ts) => ts.filter((x) => x !== t))} title="Remove" className="rounded-full border border-[color:color-mix(in_srgb,var(--ink)_18%,transparent)] px-[10px] py-[6px] text-[12px] font-semibold text-ink leading-none cursor-pointer">
              {t}
            </button>
          ))}
          {tagDraft == null ? (
            <button type="button" onClick={() => setTagDraft("")} className="rounded-full border border-dashed border-[color:color-mix(in_srgb,var(--dim)_50%,transparent)] px-[10px] py-[6px] text-[12px] text-dim leading-none cursor-pointer inline-flex items-center gap-1">
              <span className="font-bold">+</span> {tags.length ? "Tag" : "Add a tag"}
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const t = tagDraft.trim();
                if (t && !tags.includes(t)) setTags([...tags, t]);
                setTagDraft(null);
              }}
            >
              <input autoFocus value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onBlur={() => setTagDraft(null)} placeholder="New tag" maxLength={30} className="rounded-full bg-card border border-hair px-3 py-[5px] text-[12px] text-ink w-[140px] focus:outline-none focus:border-accent" />
            </form>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        {said && <span className="text-[12px] text-dim">Saved in this browser: it shows in your Watchlog. Saving to your account opens with accounts.</span>}
        <button type="button" onClick={save} className="h-9 px-5 rounded-full bg-accent-fill text-on-accent text-[13px] font-semibold cursor-pointer hover:brightness-110">
          Save
        </button>
      </div>
    </div>
  );
}

function Star({ fill }: { fill: number }) {
  const path = "M12 2.2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.1l-6.1 3.5 1.5-6.8-5.2-4.6 6.9-.7z";
  return (
    <span className="relative w-[18px] h-[18px] pointer-events-none">
      <svg width="18" height="18" viewBox="0 0 24 24" className="absolute inset-0 text-dim" aria-hidden>
        <path d={path} fill="currentColor" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" transform="translate(1.2 1.2) scale(.9)" />
      </svg>
      {fill > 0 && (
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" className="text-accent" aria-hidden>
            <path d={path} fill="currentColor" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" transform="translate(1.2 1.2) scale(.9)" />
          </svg>
        </span>
      )}
    </span>
  );
}
