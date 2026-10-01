"use client";

import { useEffect, useState } from "react";
import type { ProfileTitle } from "@/lib/public-profile";
import { readTakes, saveTake as keepInBrowser } from "@/lib/local-takes";
import { ConfirmKey } from "./ConfirmKey";
import { WatchedOn } from "./WatchedOn";
import { useRouter } from "next/navigation";
import { removeTake, saveTake } from "@/lib/library-actions";
import { MOOD_IDS, type TakeInput, type TakeTarget } from "@/lib/library-rules";

// The person's own take on a title, as the app's "Your take". Its cards, as the app draws them (kodigoTakeCard): the
// rating, ten stars in half steps; how it made them feel, up to three of the
// app's twelve moods (the fourth waits until one is taken off); tags; the review itself, with spoilers, the day they
// watched and whether it was a rewatch; the note, which stays private; and
// tags last.
//
// Signed in (`live`), it opens on what their library holds for the title
// (`initial`) and Save writes it there with the app's rules (saveTake in
// lib/library-actions.ts): the review is checked by the word filter, the
// note stays private, and saving logs the watch. Remove takes the take off.
// Signed out, it's kept in this browser, for the preview's Watchlog.
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

export function YourReview({ kind, title, out, target, initial = null, live = false }: { kind: "movie" | "show" | "episode"; title: ProfileTitle; /** The day it came out, offered as a quick pick for when they watched. */ out?: string | null; target?: TakeTarget; initial?: TakeInput | null; live?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // Signed in, the box starts on what their library holds.
  const from = live && target ? initial : null;
  const [saved, setSaved] = useState(!!from);
  const [rating, setRating] = useState<number | null>(from?.rating ?? null);
  const [moods, setMoods] = useState<string[]>(() => (from?.moods ?? []).map((id) => MOODS[MOOD_IDS.indexOf(id)]?.[1]).filter((m): m is (typeof MOODS)[number][1] => !!m));
  const [tags, setTags] = useState<string[]>(from?.tags ?? []);
  const [tagDraft, setTagDraft] = useState<string | null>(null);
  const [text, setText] = useState(from?.text ?? "");
  const [spoilers, setSpoilers] = useState(from?.spoilers ?? false);
  const [watchedOn, setWatchedOn] = useState(from?.watchedOn ?? "");
  const [rewatch, setRewatch] = useState(from?.rewatch ?? false);
  const [note, setNote] = useState(from?.note ?? "");
  const [said, setSaid] = useState(false);

  // Signed out: what they submitted here before, from this browser.
  useEffect(() => {
    if (live && target) return;
    const k = readTakes()[title.key];
    if (!k) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRating(k.rating);
    setMoods(k.moods);
    setTags(k.tags);
    setText(k.text);
    setSpoilers(k.spoilers);
    setRewatch(k.rewatch);
    setWatchedOn(k.date);
    setNote(k.note);
  }, [title.key, live, target, initial]);

  async function save() {
    if (live && target) {
      setBusy(true);
      setProblem(null);
      setSaid(false);
      const input: TakeInput = { rating, moods: moods.map((m) => MOOD_IDS[MOODS.findIndex(([, label]) => label === m)]).filter(Boolean), tags, text, spoilers, watchedOn, rewatch, note };
      const r = await saveTake(target, input).catch(() => ({ error: "That didn't save. Try again." }));
      setBusy(false);
      if (r.error) return setProblem(r.error);
      const empty = rating == null && !moods.length && !tags.length && !text.trim() && !watchedOn && !note.trim();
      setSaved(!empty);
      setSaid(true);
      router.refresh();
      return;
    }
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    keepInBrowser({ t: title, date: watchedOn || today, rating, text, spoilers, rewatch, moods, tags, note });
    setSaid(true);
  }

  /** Takes the whole take off: review, rating, moods, tags, note. */
  async function remove() {
    if (!target) return;
    setBusy(true);
    setProblem(null);
    const r = await removeTake(target).catch(() => ({ error: "That didn't work. Try again." }));
    setBusy(false);
    if (r.error) return setProblem(r.error);
    setRating(null);
    setMoods([]);
    setTags([]);
    setText("");
    setSpoilers(false);
    setRewatch(false);
    setWatchedOn("");
    setNote("");
    setSaved(false);
    setSaid(true);
    router.refresh();
  }

  const card = "rounded-shell bg-piece p-3 grid gap-2.5";
  const heading = "text-[1.125rem] font-semibold text-ink";
  const field = "w-full rounded-[12px] bg-card border border-hair px-3 py-2 text-[1.0417rem] leading-[1.6] text-ink placeholder:text-dim focus:outline-none focus:border-accent";
  const what = kind === "movie" ? "movie" : kind === "episode" ? "episode" : "show";

  return (
    <div className="take grid gap-2">
      {/* Laid out by the width it has (take-grid in globals.css): wide, the
          rating, moods and tags in a row, the review under the first two
          and the note beside it; half a page, the rating beside the tags,
          then the moods, the review and the note each across; narrow, each
          card under the last. */}
      <div className="take-grid grid gap-2">
      {/* The rating: ten stars, a press on a star's left half sets the half. */}
      <div className={card + " content-start take-rate"}>
        <div className="flex items-center justify-between">
          <span className={heading}>Rate this {what}</span>
          {rating != null && (
            <button type="button" onClick={() => setRating(null)} className="text-[1.0417rem] font-semibold text-ink cursor-pointer">
              Clear
            </button>
          )}
        </div>
        {/* Close together, as the ratings read elsewhere on the site, rather
            than spread across the card. */}
        <div className="flex">
          {Array.from({ length: 10 }, (_, i) => {
            const fill = rating == null ? 0 : Math.max(0, Math.min(1, rating - i));
            return (
              <span key={i} className="relative h-9 w-[1.75rem] flex items-center justify-center">
                <Star fill={fill} />
                <button type="button" aria-label={`${i + 0.5} out of 10`} onClick={() => setRating(i + 0.5)} className="absolute inset-y-0 left-0 w-1/2 cursor-pointer" />
                <button type="button" aria-label={`${i + 1} out of 10`} onClick={() => setRating(i + 1)} className="absolute inset-y-0 right-0 w-1/2 cursor-pointer" />
              </span>
            );
          })}
        </div>
        <div className="text-[1rem] text-dim -mt-1">{rating != null ? `${rating} out of 10` : "Not rated yet"}</div>
      </div>

      {/* How it made them feel: the app's twelve moods, up to three. */}
      <div className={card + " take-moods"}>
        <div className={heading}>How did it make you feel?</div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-[0.5rem]">
          {MOODS.map(([emoji, label]) => {
            const on = moods.includes(label);
            const full = !on && moods.length >= 3;
            return (
              // The app's confirmation as a mood is picked; taking one off is at once.
              <ConfirmKey
                key={label}
                label={label}
                on={on}
                onFill="var(--accent-fill)"
                onInk="var(--on-accent)"
                confirm={on ? undefined : "var(--accent-fill)"}
                off={full}
                radius={10}
                run={() => setMoods((m) => (on ? m.filter((x) => x !== label) : m.length >= 3 ? m : [...m, label]))}
                className={`h-[3.8333rem] px-1.5 flex flex-col items-center justify-center gap-1 disabled:!opacity-50 ${on ? "font-semibold" : "bg-[color:var(--quiet)] text-dim"}`}
              >
                <span className="text-[1.25rem] leading-none">{emoji}</span>
                <span className="text-[0.7917rem] leading-none">{label}</span>
              </ConfirmKey>
            );
          })}
        </div>
      </div>

      {/* Tags: chips, and a dashed one to add another. */}
      <div className={card + " content-start take-tags"}>
        <div className={heading}>Tags</div>
        <div className="soft-scroll flex flex-wrap content-start gap-2 max-h-[8rem] overflow-y-auto p-[2px] -m-[2px]">
          {tags.map((t) => (
            <button key={t} type="button" onClick={() => setTags((ts) => ts.filter((x) => x !== t))} title="Remove" className="rounded-full border border-[color:color-mix(in_srgb,var(--ink)_18%,transparent)] px-[0.8333rem] py-[0.5rem] text-[1rem] font-semibold text-ink leading-none cursor-pointer">
              {t}
            </button>
          ))}
          {tagDraft == null ? (
            <button type="button" onClick={() => setTagDraft("")} className="rounded-full border border-dashed border-[color:color-mix(in_srgb,var(--dim)_50%,transparent)] px-[0.8333rem] py-[0.5rem] text-[1rem] text-dim leading-none cursor-pointer inline-flex items-center gap-1">
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
              <input autoFocus value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onBlur={() => setTagDraft(null)} placeholder="New tag" maxLength={30} className="rounded-full bg-card border border-hair px-3 py-[0.4167rem] text-[1rem] text-ink w-[11.6667rem] focus:outline-none focus:border-accent" />
            </form>
          )}
        </div>
      </div>

      {/* The review itself: what everyone else reads. */}
      <div className={card + " content-start take-review"}>
        <div className={heading}>Your review</div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={`What did you think of this ${what}?`} className={`${field} resize-y min-h-[8rem]`} />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[1.0417rem] text-ink">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} className="accent-[var(--accent-fill)]" />
            Contains spoilers
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} className="accent-[var(--accent-fill)]" />
            I&apos;ve watched this before
          </label>
          <span className="inline-flex items-center gap-2">
            <span className="text-dim">Watched on</span>
            <WatchedOn value={watchedOn} onChange={setWatchedOn} out={out ? { label: kind === "movie" ? "Release day" : kind === "episode" ? "Air date" : "First aired", date: out } : null} />
          </span>
        </div>
      </div>

      {/* The note: the app's private one, never shown to anyone else. */}
      <div className="relative take-note">
      <div className="absolute inset-0 rounded-shell bg-piece p-3 flex items-start gap-2.5">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-[0.25rem] shrink-0 text-dim">
          <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
        </svg>
        <div className="min-w-0 flex-1 h-full flex flex-col">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Note on this ${what}: only you can see it`} className="soft-scroll flex-1 min-h-0 w-full bg-transparent text-[1.0417rem] leading-[1.6] text-ink placeholder:text-dim resize-none focus:outline-none overflow-y-auto" />
        </div>
      </div>
      </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
        {problem && (
          <span role="alert" className="text-[1rem] text-loved">
            {problem}
          </span>
        )}
        {said && !problem && (
          <span role="status" className="text-[1rem] text-dim">
            {live ? (saved ? "Saved to your library. It's in your Watchlog and the app on your next sync." : "Removed.") : "Submitted in this browser: it shows in your Watchlog. Sending it to your account opens with accounts."}
          </span>
        )}
        {live && saved && (
          <button type="button" onClick={remove} disabled={busy} className="h-9 px-4 rounded-full bg-card border border-hair text-[1.0833rem] font-semibold text-ink cursor-pointer hover:text-loved disabled:opacity-50">
            Remove
          </button>
        )}
        <button type="button" onClick={save} disabled={busy} className="h-9 px-5 rounded-full bg-accent-fill text-on-accent text-[1.0833rem] font-semibold cursor-pointer hover:brightness-110 disabled:opacity-60">
          {busy ? "Saving…" : live ? "Save" : "Submit"}
        </button>
      </div>
    </div>
  );
}

function Star({ fill }: { fill: number }) {
  const path = "M12 2.2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.1l-6.1 3.5 1.5-6.8-5.2-4.6 6.9-.7z";
  return (
    <span className="relative w-[1.5rem] h-[1.5rem] pointer-events-none">
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
