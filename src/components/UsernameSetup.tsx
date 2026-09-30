"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { claimUsername, usernameAvailable } from "@/lib/username-actions";

const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";

// The username form: the name, checked as it's typed; what a public profile
// shows; public or private; save, then on to the profile.
export function UsernameSetup({ current, initialPrivate, suggestion }: { current: string | null; initialPrivate: boolean; suggestion: string }) {
  const router = useRouter();
  const [name, setName] = useState(current ?? suggestion);
  const [isPrivate, setPrivate] = useState(initialPrivate);
  const [check, setCheck] = useState<{ for: string; ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const clean = name.trim().toLowerCase();
  // Checked a moment after typing stops.
  useEffect(() => {
    if (!clean) return;
    const t = setTimeout(async () => {
      const r = await usernameAvailable(clean).catch(() => null);
      if (r) setCheck({ for: clean, ...r });
    }, 350);
    return () => clearTimeout(t);
  }, [clean]);
  const status = check && check.for === clean ? check : null;

  async function save() {
    setBusy(true);
    setError(null);
    const r = await claimUsername(clean, isPrivate).catch(() => ({ ok: false as const, message: "That didn't save. Try again." }));
    if (!r.ok) {
      setError(r.message);
      setBusy(false);
      return;
    }
    setSaved(true);
    router.push(`/u/${r.username}`);
  }

  const option = (on: boolean, title: string, text: string, pick: () => void) => (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={pick}
      className={`text-left rounded-[12px] bg-card p-3 flex items-start gap-3 cursor-pointer ${on ? "ring-[1.5px] ring-inset ring-accent-fill" : "hover:ring-1 hover:ring-inset hover:ring-hair"}`}
    >
      <span aria-hidden className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-[1.5px] flex items-center justify-center ${on ? "border-accent-fill" : "border-hair"}`}>
        {on && <span className="w-2 h-2 rounded-full bg-accent-fill" />}
      </span>
      <span>
        <span className="block text-[12.5px] font-semibold text-ink">{title}</span>
        <span className="block text-[12.5px] leading-[1.5] text-dim">{text}</span>
      </span>
    </button>
  );

  return (
    <div className="max-w-[600px] mx-auto grid gap-8">
      <div className={SHELL}>
        <div className="rounded-shell bg-piece p-4 grid gap-4">
          <div>
            <h1 className="!text-[clamp(32px,4.4vw,48px)] !leading-[.9] tracking-[.02em] uppercase">{current ? "Your username" : "Choose your username"}</h1>
            <p className="m-0 mt-2 text-[12.5px] leading-[1.6] text-mid-tone">It&apos;s how people find you on Kodigo.</p>
          </div>

          <label className="grid gap-1.5">
            <span className="text-[12.5px] text-dim">Username</span>
            <span className={`flex items-center rounded-[12px] bg-card border px-3 ${status && !status.ok ? "border-loved" : "border-hair focus-within:border-accent"}`}>
              <span className="text-[14px] text-dim select-none">@</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value.replace(/\s/g, "").slice(0, 20));
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={status ? !status.ok : undefined}
                aria-describedby="username-status"
                className="flex-1 min-w-0 bg-transparent py-2 text-[14px] text-ink focus:outline-none"
              />
            </span>
            {/* The checker: as they type, whether the name is free. */}
            <span id="username-status" role="status" className={`flex items-center gap-1.5 text-[12.5px] min-h-[18px] ${status ? (status.ok ? "text-seen" : "text-loved") : "text-dim"}`}>
              {status && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {status.ok ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6 6l12 12M18 6L6 18" />}
                </svg>
              )}
              {!clean ? "3 to 20 letters, numbers, dots or underscores." : status ? status.message : "Checking…"}
            </span>
          </label>

          {current && clean !== current && <p className="m-0 -mt-2 text-[12.5px] leading-[1.6] text-dim">Links to @{current} stop working when you change it.</p>}

          <p className="m-0 text-[12.5px] leading-[1.6] text-mid-tone">Your profile shows your reviews, ratings, lists and what you&apos;ve watched. Never your email. You can change this any time in Settings.</p>

          <div role="radiogroup" aria-label="Who can see your profile" className="grid gap-2">
            {option(!isPrivate, "Public", "Anyone can see your profile.", () => setPrivate(false))}
            {option(isPrivate, "Private", "Only people you approve can see it.", () => setPrivate(true))}
          </div>

          {error && (
            <p role="alert" className="m-0 text-[12.5px] text-loved">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <button type="button" onClick={save} disabled={busy || saved || !status?.ok} className="h-10 px-5 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default">
              {busy || saved ? "Saving…" : current ? "Save" : "Save and see your profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
