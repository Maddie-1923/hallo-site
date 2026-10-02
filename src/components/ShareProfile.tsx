"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Sharing a profile (the ⋯ menu's Share profile): a sheet with the story
// card (app/u/[username]/story) and the profile's address. A picture can't
// hold a link, so the address travels with it: where the browser can share
// files (phones), Share… hands both to the system share sheet (Messages and
// WhatsApp show the link; an Instagram story takes it as a link sticker, so
// it's copied too). The card is fetched as the sheet opens, so the press on
// Share… opens the share sheet at once, as browsers require. Copy link and
// Save image are always there.

export function ShareSheet({ username, onClose, say }: { username: string; onClose: () => void; say: (text: string) => void }) {
  const url = typeof location === "undefined" ? `/u/${username}` : new URL(`/u/${username}`, location.origin).href;
  const [loaded, setLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/u/${username}/story`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!live || !b) return;
        const f = new File([b], `kodigo-${username}.png`, { type: "image/png" });
        if (navigator.canShare?.({ files: [f] })) setFile(f);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [username]);
  useEffect(() => {
    const onKey = (k: KeyboardEvent) => k.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const button = "inline-flex items-center justify-center h-10 px-5 rounded-full text-[1.0833rem] font-semibold cursor-pointer no-underline";
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Share profile" className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-[30rem] rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl p-4 grid gap-3" onClick={(x) => x.stopPropagation()}>
        <h3 className="!text-[clamp(26px,3vw,34px)] !leading-[.95]">Share profile</h3>
        <div className="mx-auto w-[15rem] aspect-[9/16] rounded-[12px] overflow-hidden bg-card-hi border border-hair">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/u/${username}/story`} alt={`@${username}'s profile card`} onLoad={() => setLoaded(true)} className={`w-full h-full object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`} />
        </div>
        <p className="m-0 text-[1.0417rem] text-dim text-center break-all">{url}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {file && (
            <button
              type="button"
              onClick={async () => {
                navigator.clipboard?.writeText(url).catch(() => {});
                try {
                  await navigator.share({ files: [file], url, title: `@${username} on Kodigo`, text: url });
                } catch {
                  // Closing the share sheet isn't a failure.
                }
              }}
              className={`${button} bg-accent-fill text-on-accent`}
            >
              Share…
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                say("Profile link copied");
              } catch {
                say("Couldn't copy the link");
              }
            }}
            className={`${button} ${file ? "bg-card-hi border border-hair text-ink" : "bg-accent-fill text-on-accent"}`}
          >
            Copy link
          </button>
          <a href={`/u/${username}/story?download=1`} download={`kodigo-${username}.png`} className={`${button} bg-card-hi border border-hair text-ink`}>
            Save image
          </a>
          <button type="button" onClick={onClose} className={`${button} text-dim hover:text-ink`}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
