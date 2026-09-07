"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/profile";
import { saveProfile } from "@/lib/profile-actions";
import { poster } from "@/lib/archive";

type Pick = { path: string; title: string };

// The "Edit" sheet: a name, a banner from the library's backdrops, an avatar
// from its posters. Only titles the person tracks are offered — the banner
// is meant to say something about them, and the choice stays inside TMDB
// artwork so there's no upload to moderate or host.
export function EditProfile({ profile, backdrops, posters, fallbackName }: { profile: Profile; backdrops: Pick[]; posters: Pick[]; fallbackName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile.display_name ?? "");
  const [banner, setBanner] = useState(profile.banner_path);
  const [focus, setFocus] = useState(profile.banner_focus);
  const [avatar, setAvatar] = useState(profile.avatar_path);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  function save() {
    setError(undefined);
    start(async () => {
      const r = await saveProfile({ display_name: name, banner_path: banner, avatar_path: avatar, banner_focus: focus });
      if (r.error) return setError(r.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className="btn ghost !py-2 !px-4 text-sm" onClick={() => setOpen(true)}>
        Edit
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Edit profile"
            className="w-full max-w-[640px] max-h-[88vh] overflow-y-auto rounded-2xl border border-hair bg-card p-5 shadow-[0_30px_80px_rgba(0,0,0,.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Edit profile</h3>

            <label className="block text-[11px] font-bold tracking-[.14em] uppercase text-dim mt-5 mb-2" htmlFor="display_name">Name</label>
            <input id="display_name" className="field" value={name} maxLength={40} placeholder={fallbackName} onChange={(e) => setName(e.target.value)} />

            <div className="text-[11px] font-bold tracking-[.14em] uppercase text-dim mt-5 mb-2">Banner</div>
            {backdrops.length === 0 ? (
              <p className="text-sm text-dim m-0">Add a few titles to your lists and their artwork shows up here.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <Choice on={banner === null} onClick={() => setBanner(null)} label="None" wide />
                {backdrops.map((b) => (
                  <Choice key={b.path} on={banner === b.path} onClick={() => setBanner(b.path)} label={b.title} wide src={`${imgBase()}/w300${b.path}`} />
                ))}
              </div>
            )}

            {/* The crop, shown at the size it will be rather than described.
                Dragging moves the picture inside the frame, which is the only
                way to know what a number means here. */}
            {banner && (
              <div className="mt-3">
                <div className="relative rounded-xl overflow-hidden aspect-[4/1] bg-card-hi">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${imgBase()}/w780${banner}`}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: `50% ${focus}%` }}
                  />
                </div>
                <label className="flex items-center gap-3 mt-2 text-xs text-dim">
                  Crop
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={focus}
                    onChange={(e) => setFocus(Number(e.target.value))}
                    className="flex-1 accent-[var(--accent-fill)] cursor-pointer"
                    aria-label="Which part of the banner to show"
                  />
                  <button type="button" className="hover:text-ink cursor-pointer" onClick={() => setFocus(40)}>
                    Reset
                  </button>
                </label>
              </div>
            )}

            <div className="text-[11px] font-bold tracking-[.14em] uppercase text-dim mt-5 mb-2">Avatar</div>
            {posters.length === 0 ? (
              <p className="text-sm text-dim m-0">Posters from your lists become avatar choices.</p>
            ) : (
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                <Choice on={avatar === null} onClick={() => setAvatar(null)} label="Initial" round />
                {posters.map((p) => (
                  <Choice key={p.path} on={avatar === p.path} onClick={() => setAvatar(p.path)} label={p.title} round src={poster(p.path, "w185") ?? undefined} />
                ))}
              </div>
            )}

            {error && <p className="text-sm mt-4 mb-0" style={{ color: "var(--movies)" }} role="alert">{error}</p>}
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" className="btn" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function imgBase() {
  return process.env.NEXT_PUBLIC_TMDB_IMAGE_URL ?? "https://image.tmdb.org/t/p";
}

function Choice({ on, onClick, label, src, wide, round }: { on: boolean; onClick: () => void; label: string; src?: string; wide?: boolean; round?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={label}
      className={`relative overflow-hidden bg-card-hi border-2 transition-colors cursor-pointer ${round ? "rounded-full aspect-square" : "rounded-lg aspect-video"} ${
        on ? "border-accent-fill" : "border-transparent hover:border-hair"
      }`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className={`w-full h-full object-cover ${round ? "object-top" : ""}`} />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-dim">{label}</span>
      )}
      {wide && src && <span className="absolute inset-x-0 bottom-0 px-1.5 py-0.5 text-[10px] truncate text-bone" style={{ background: "rgba(0,0,0,.55)" }}>{label}</span>}
    </button>
  );
}
