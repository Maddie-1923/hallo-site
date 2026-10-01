"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileTitle } from "@/lib/public-profile";
import { saveProfile } from "@/lib/profile-actions";

// The owner's photo and banner, chosen from the artwork of what they track:
// a backdrop for the banner, a poster for the photo. The choice stays inside
// TMDB's artwork, so there's no upload to host or moderate. The name is in
// Settings with the rest of the account.
type Pick = { path: string; title: string; src: string };

/** "/abc.jpg" out of a TMDB image address. */
const pathOf = (url: string | null) => url?.match(/\/t\/p\/[a-z0-9]+(\/[^/?#]+)$/)?.[1] ?? null;

export function ProfilePictures({ library, avatar, banner }: { library: ProfileTitle[]; avatar: string | null; banner: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 px-4 rounded-full bg-black/45 border border-white/25 backdrop-blur-md text-white text-[1.0417rem] font-semibold cursor-pointer hover:bg-black/60"
      >
        Photo &amp; banner
      </button>
      {open && <Sheet library={library} avatar={pathOf(avatar)} banner={pathOf(banner)} onClose={() => setOpen(false)} />}
    </>
  );
}

function Sheet({ library, avatar: startAvatar, banner: startBanner, onClose }: { library: ProfileTitle[]; avatar: string | null; banner: string | null; onClose: () => void }) {
  const router = useRouter();
  const [banner, setBanner] = useState(startBanner);
  const [avatar, setAvatar] = useState(startAvatar);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const picks = (field: "backdrop" | "poster") => {
    const seen = new Set<string>();
    const out: Pick[] = [];
    for (const t of library) {
      const path = pathOf(t[field]);
      if (!path || seen.has(path)) continue;
      seen.add(path);
      out.push({ path, title: t.title, src: t[field]! });
    }
    return out.slice(0, 60);
  };
  const backdrops = picks("backdrop");
  const posters = picks("poster");

  async function save() {
    setBusy(true);
    setProblem(null);
    const r = await saveProfile({ banner_path: banner, avatar_path: avatar }).catch(() => ({ error: "That didn't save. Try again." }));
    setBusy(false);
    if (r.error) return setProblem(r.error);
    onClose();
    router.refresh();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Photo and banner" className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-[63.3333rem] max-h-[88vh] flex flex-col overflow-hidden rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-hair flex items-center justify-between gap-3">
          <h3 className="!text-[clamp(26px,3vw,34px)] !leading-[.95]">Photo &amp; banner</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 w-9 h-9 rounded-full bg-card-hi hover:bg-hair text-ink flex items-center justify-center cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="block">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto soft-scroll grid gap-5">
          <section className="grid gap-2">
            <div className="text-[0.875rem] font-bold tracking-[.12em] uppercase text-dim">Photo</div>
            {posters.length === 0 ? (
              <p className="m-0 text-[1.0417rem] text-dim">Track a few titles and their posters show up here.</p>
            ) : (
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                <Choice on={avatar === null} onClick={() => setAvatar(null)} label="Your initial" round />
                {posters.map((p) => (
                  <Choice key={p.path} on={avatar === p.path} onClick={() => setAvatar(p.path)} label={p.title} src={p.src} round />
                ))}
              </div>
            )}
          </section>
          <section className="grid gap-2">
            <div className="text-[0.875rem] font-bold tracking-[.12em] uppercase text-dim">Banner</div>
            {backdrops.length === 0 ? (
              <p className="m-0 text-[1.0417rem] text-dim">Track a few titles and their pictures show up here.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Choice on={banner === null} onClick={() => setBanner(null)} label="Your latest watch" />
                {backdrops.map((b) => (
                  <Choice key={b.path} on={banner === b.path} onClick={() => setBanner(b.path)} label={b.title} src={b.src} />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="p-4 border-t border-hair flex items-center justify-between gap-3">
          <span className={`text-[1.0417rem] ${problem ? "text-loved" : "text-dim"}`} role={problem ? "alert" : undefined}>
            {problem ?? "Everyone who can see your profile sees these."}
          </span>
          <button type="button" onClick={save} disabled={busy} className="h-9 px-5 rounded-full bg-accent-fill text-on-accent text-[1.0417rem] font-semibold cursor-pointer disabled:opacity-40">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Choice({ on, onClick, label, src, round }: { on: boolean; onClick: () => void; label: string; src?: string; round?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={label}
      aria-label={label}
      className={`relative overflow-hidden bg-card-hi cursor-pointer outline-offset-2 ${round ? "rounded-full aspect-square" : "rounded-[10px] aspect-video"} ${on ? "outline outline-2 outline-[color:var(--accent-fill)]" : "opacity-80 hover:opacity-100"}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className={`w-full h-full object-cover ${round ? "object-top" : ""}`} />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center p-1 text-center text-[0.9167rem] leading-tight text-dim">{label}</span>
      )}
    </button>
  );
}
