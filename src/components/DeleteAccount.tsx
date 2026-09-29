"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { APPEARANCE_KEY, THEME_KEY } from "@/lib/theme";

// Delete account (Settings), in the app's words: a sheet saying what goes and
// what stays, a nudge to export first, and "DELETE" typed to confirm. Signed
// in, it deletes the account on the server (/api/account) and signs out. In
// the development preview, which has no account, it clears everything Kodigo
// keeps in this browser (but not the look of the site, theme and day/night,
// which belong to the browser).
export function DeleteAccount({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const ready = typed.trim().toUpperCase() === "DELETE";

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && !busy && setOpen(false);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, busy]);

  async function go() {
    setBusy(true);
    setError(null);
    if (signedIn) {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        setError((await res.text()) || "Couldn't delete the account. Nothing was changed.");
        setBusy(false);
        return;
      }
    } else {
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith("kodigo") && k !== THEME_KEY && k !== APPEARANCE_KEY) localStorage.removeItem(k);
        document.cookie = "kodigo-region=; path=/; max-age=0";
      } catch {}
    }
    setDone(true);
    setBusy(false);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1800);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="h-8 px-4 rounded-full text-[12.5px] font-semibold cursor-pointer bg-loved/20 text-loved hover:bg-loved/30 transition-colors">
        Delete
      </button>
      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label="Delete your Kodigo account?" className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={() => !busy && setOpen(false)}>
            <div className="w-full sm:max-w-[460px] rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
              <div className="rounded-shell bg-piece p-4 grid gap-3">
                {done ? (
                  <p className="m-0 text-[12.5px] leading-[1.6] text-ink">{signedIn ? "Your account has been deleted." : "Everything Kodigo kept in this browser has been cleared."} Taking you home…</p>
                ) : (
                  <>
                    <h3 className="!text-[clamp(24px,2.6vw,30px)] !leading-none uppercase">Delete your Kodigo account?</h3>
                    <p className="m-0 text-[12.5px] leading-[1.6] text-mid-tone">
                      Your sign-in, the copy of your library on the server and your profile are deleted, with your reviews, lists, follows and likes. This can&apos;t be undone. The library on your phone stays exactly as it is, and so does any backup you&apos;ve saved.
                    </p>
                    {!signedIn && <p className="m-0 text-[12.5px] leading-[1.6] text-dim">In this preview there&apos;s no account yet, so this clears everything Kodigo keeps in this browser instead: your settings, profile details, takes and choices. Theme and day or night stay.</p>}
                    <p className="m-0 text-[12.5px] leading-[1.6] text-mid-tone">
                      Want a copy first?{" "}
                      <a href="/api/export" download className="text-accent no-underline hover:underline">
                        Export your library
                      </a>
                      .
                    </p>
                    <label className="grid gap-1.5 text-[12.5px] text-dim">
                      Type DELETE to confirm
                      <input
                        autoFocus
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        className="rounded-[10px] bg-card border border-hair px-2.5 py-1.5 text-[12.5px] text-ink tracking-[.08em] focus:outline-none focus:border-accent"
                      />
                    </label>
                    {error && (
                      <p role="alert" className="m-0 text-[12.5px] text-loved">
                        {error}
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button type="button" disabled={busy} onClick={() => setOpen(false)} className="h-9 px-4 rounded-full bg-card border border-hair text-[12.5px] font-semibold text-ink cursor-pointer">
                        Cancel
                      </button>
                      <button type="button" disabled={!ready || busy} onClick={go} className="h-9 px-4 rounded-full bg-loved text-white text-[12.5px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default">
                        {busy ? "Deleting…" : "Delete account"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
