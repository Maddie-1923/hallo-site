"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { ProfileTitle } from "@/lib/public-profile";
import { profileArtwork, savePicture, type ArtChoice, type PictureTarget } from "@/lib/picture-actions";
import { HeadingPill } from "./TitleParts";

// The owner's photo and banner, chosen as the app chooses them: a picture
// from their computer, or the artwork of something they track (a textless
// poster for the photo, a backdrop for the banner), framed in the same crop
// the app draws, then saved as the finished crop where the app keeps it
// (lib/picture-actions.ts), so the phone shows the same two. The initial and
// the latest watch take a picture away again. The name is in Settings with
// the rest of the account.

// The app's frames (PhotoEditing.swift's CropSheet): a square shown as a
// circle for the photo, the banner's 393 by 170 card, and how far in it goes.
const BANNER_ASPECT = 393 / 170;
const MAX_ZOOM = 5;
// The saved sizes (ProfilePictures.swift): the longest side, never upscaled.
const LONGEST = { avatar: 600, banner: 1600 } as const;
const QUALITY = 0.88;

type Step =
  | { at: "home" }
  | { at: "titles"; target: PictureTarget }
  | { at: "art"; target: PictureTarget; title: ProfileTitle }
  | { at: "crop"; target: PictureTarget; src: string; remote: boolean; back: Step };

export function ProfilePictures({ library, avatar, banner, latest, name }: { library: ProfileTitle[]; avatar: string | null; banner: string | null; latest: string | null; name: string }) {
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
      {open && createPortal(<Sheet library={library} avatar={avatar} banner={banner} latest={latest} name={name} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

const PILL = "h-9 px-4 rounded-full bg-piece border border-hair text-ink text-[1.0417rem] font-semibold cursor-pointer hover:bg-card-hi disabled:opacity-40 disabled:cursor-default";
const PRIMARY = "h-9 px-5 rounded-full bg-accent-fill text-on-accent text-[1.0417rem] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default";

function Sheet({ library, avatar, banner, latest, name, onClose }: { library: ProfileTitle[]; avatar: string | null; banner: string | null; latest: string | null; name: string; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ at: "home" });
  const [busy, setBusy] = useState<PictureTarget | null>(null);
  const [note, setNote] = useState<{ text: string; problem: boolean } | null>(null);
  // The uploaded file's address while it's being cropped, let go after.
  const uploaded = useRef<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<PictureTarget>("avatar");

  const letGo = useCallback(() => {
    if (uploaded.current) URL.revokeObjectURL(uploaded.current);
    uploaded.current = null;
  }, []);
  useEffect(() => letGo, [letGo]);

  // Escape steps back, and closes from the first step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (step.at === "home") onClose();
      else if (step.at === "crop") {
        letGo();
        setStep(step.back);
      } else if (step.at === "art") setStep({ at: "titles", target: step.target });
      else setStep({ at: "home" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onClose, letGo]);

  async function save(target: PictureTarget, jpeg: string | null) {
    setBusy(target);
    setNote(null);
    const r = await savePicture(target, jpeg).catch(() => ({ error: "That didn't save. Try again." }));
    setBusy(null);
    if (r.error) {
      setNote({ text: r.error, problem: true });
      return false;
    }
    letGo();
    setStep({ at: "home" });
    setNote({ text: target === "avatar" ? "Photo saved." : "Banner saved.", problem: false });
    router.refresh();
    return true;
  }

  function upload(target: PictureTarget) {
    uploadFor.current = target;
    setNote(null);
    file.current?.click();
  }

  function picked(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setNote({ text: "That isn't a picture. Choose a JPEG, PNG or similar.", problem: true });
    if (f.size > 40 * 1024 * 1024) return setNote({ text: "That picture is over 40 MB. Choose a smaller one.", problem: true });
    letGo();
    uploaded.current = URL.createObjectURL(f);
    setStep({ at: "crop", target: uploadFor.current, src: uploaded.current, remote: false, back: { at: "home" } });
  }

  const bannerShown = banner ?? latest;
  const heading = step.at === "home" ? "Photo & banner" : step.target === "avatar" ? "Choose a photo" : "Choose a banner";
  const back = () => {
    setNote(null);
    if (step.at === "crop") {
      letGo();
      setStep(step.back);
    } else if (step.at === "art") setStep({ at: "titles", target: step.target });
    else setStep({ at: "home" });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={heading} className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-[63.3333rem] max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-hair flex items-center gap-3">
          {step.at !== "home" && (
            <button type="button" onClick={back} aria-label="Back" className="shrink-0 w-9 h-9 rounded-full bg-card-hi hover:bg-hair text-ink flex items-center justify-center cursor-pointer">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="block">
                <path d="M7.5 1.5L3 6l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <HeadingPill small>
              <span className="block truncate max-w-[16rem] sm:max-w-[40rem]">{step.at === "art" ? step.title.title : heading}</span>
            </HeadingPill>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 w-9 h-9 rounded-full bg-card-hi hover:bg-hair text-ink flex items-center justify-center cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="block">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <input
          ref={file}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            picked(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {step.at === "home" && (
          <div className="p-4 overflow-y-auto soft-scroll grid gap-5">
            <section className="grid gap-3">
              <div className="text-[0.875rem] font-bold tracking-[.12em] uppercase text-dim">Photo</div>
              <div className="flex items-center gap-4 min-w-0">
                <div className="shrink-0 w-[6.6667rem] h-[6.6667rem] rounded-full overflow-hidden bg-accent-fill text-on-accent flex items-center justify-center display text-[3rem] leading-none">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="Your photo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="pt-[0.25rem]">{(name[0] ?? "?").toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 min-w-0">
                  <button type="button" className={PILL} disabled={busy !== null} onClick={() => upload("avatar")}>Upload from your computer</button>
                  <button type="button" className={PILL} disabled={busy !== null} onClick={() => setStep({ at: "titles", target: "avatar" })}>Choose from your shows and films</button>
                  <button type="button" className={PILL} disabled={busy !== null || !avatar} aria-pressed={!avatar} onClick={() => save("avatar", null)}>
                    {busy === "avatar" ? "Saving…" : !avatar ? "Your initial ✓" : "Your initial"}
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-3 pt-5 border-t border-hair">
              <div className="text-[0.875rem] font-bold tracking-[.12em] uppercase text-dim">Banner</div>
              <div className="w-full max-w-[33.3333rem] rounded-[12px] overflow-hidden bg-card-hi" style={{ aspectRatio: `${BANNER_ASPECT}` }}>
                {bannerShown ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bannerShown} alt="Your banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ background: "linear-gradient(135deg, var(--accent-night), #1a1a19)" }} />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={PILL} disabled={busy !== null} onClick={() => upload("banner")}>Upload from your computer</button>
                <button type="button" className={PILL} disabled={busy !== null} onClick={() => setStep({ at: "titles", target: "banner" })}>Choose from your shows and films</button>
                <button type="button" className={PILL} disabled={busy !== null || !banner} aria-pressed={!banner} onClick={() => save("banner", null)}>
                  {busy === "banner" ? "Saving…" : !banner ? "Your latest watch ✓" : "Your latest watch"}
                </button>
              </div>
            </section>
          </div>
        )}

        {step.at === "titles" && <Titles library={library} onPick={(title) => setStep({ at: "art", target: step.target, title })} />}

        {step.at === "art" && (
          <Artwork
            key={`${step.title.key}-${step.target}`}
            title={step.title}
            target={step.target}
            onPick={(c) => {
              setNote(null);
              setStep({ at: "crop", target: step.target, src: c.full, remote: true, back: step });
            }}
          />
        )}

        {step.at === "crop" && <Crop key={step.src} src={step.src} remote={step.remote} target={step.target} busy={busy !== null} onCancel={back} onSave={(jpeg) => save(step.target, jpeg)} onProblem={(text) => setNote({ text, problem: true })} />}

        <div className="px-4 py-3 border-t border-hair flex items-center justify-between gap-3">
          <span className={`text-[1.0417rem] min-w-0 ${note?.problem ? "text-loved" : "text-dim"}`} role={note?.problem ? "alert" : "status"}>
            {note?.text ?? "Everyone who can see your profile sees these, here and in the app."}
          </span>
          {step.at === "home" && (
            <button type="button" onClick={onClose} className={PRIMARY}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// The owner's shows and films, posters only, with a box to narrow them.
function Titles({ library, onPick }: { library: ProfileTitle[]; onPick: (t: ProfileTitle) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = library.filter((t) => !q || t.title.toLowerCase().includes(q));
  const groups = [
    { label: "Shows", titles: shown.filter((t) => t.kind === "show") },
    { label: "Films", titles: shown.filter((t) => t.kind === "movie") },
  ];
  return (
    <div className="flex flex-col min-h-0">
      <div className="px-4 pt-4">
        <label className="flex items-center gap-2 h-9 px-3 rounded-full bg-piece border border-hair">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden className="text-dim shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter your shows and films" aria-label="Filter your shows and films" className="flex-1 min-w-0 bg-transparent text-[1.0417rem] text-ink placeholder:text-dim focus:outline-none" />
        </label>
      </div>
      <div className="p-4 overflow-y-auto soft-scroll grid gap-4">
        {library.length === 0 ? (
          <p className="m-0 text-[1.0417rem] text-dim">Track a show or a film and its artwork shows up here.</p>
        ) : shown.length === 0 ? (
          <p className="m-0 text-[1.0417rem] text-dim">Nothing in your library matches “{query.trim()}”.</p>
        ) : (
          groups.map((g) =>
            g.titles.length === 0 ? null : (
              <section key={g.label} className="grid gap-2">
                <div className="text-[0.875rem] font-bold tracking-[.12em] uppercase text-dim">{g.label}</div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {g.titles.map((t) => (
                    <button key={t.key} type="button" onClick={() => onPick(t)} className="text-left cursor-pointer group min-w-0" aria-label={t.title}>
                      <div className="aspect-[2/3] rounded-[8px] overflow-hidden bg-card-hi border border-hair group-hover:border-accent transition-colors">
                        {t.poster ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.poster.replace("/w780/", "/w342/")} alt="" loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center p-1 text-center text-[0.9167rem] leading-tight text-dim">{t.title}</span>
                        )}
                      </div>
                      <div className="mt-1 text-[0.9583rem] leading-tight text-ink line-clamp-2">{t.title}</div>
                    </button>
                  ))}
                </div>
              </section>
            ),
          )
        )}
      </div>
    </div>
  );
}

// One title's artwork from TMDB: textless posters for the photo, backdrops
// for the banner, best-rated first.
function Artwork({ title, target, onPick }: { title: ProfileTitle; target: PictureTarget; onPick: (c: ArtChoice) => void }) {
  const [choices, setChoices] = useState<ArtChoice[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const id = Number(title.key.slice(1));

  useEffect(() => {
    let live = true;
    profileArtwork(title.kind, id, target)
      .catch(() => ({ error: "Couldn't load the artwork. Try again.", choices: undefined }))
      .then((r) => {
        if (!live) return;
        if (r.error) setProblem(r.error);
        else setChoices(r.choices ?? []);
      });
    return () => {
      live = false;
    };
  }, [title.kind, id, target, attempt]);

  if (problem)
    return (
      <div className="p-4 grid gap-3 justify-items-start">
        <p className="m-0 text-[1.0417rem] text-dim">{problem}</p>
        <button
          type="button"
          className={PILL}
          onClick={() => {
            setProblem(null);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  if (!choices) return <p className="m-0 p-4 text-[1.0417rem] text-dim">Loading the artwork…</p>;
  if (choices.length === 0)
    return <p className="m-0 p-4 text-[1.0417rem] text-dim">{target === "avatar" ? "TMDB has no posters without lettering for this title yet. Try another, or upload your own." : "TMDB has no backdrops for this title yet. Try another, or upload your own."}</p>;
  return (
    <div className="p-4 overflow-y-auto soft-scroll grid gap-2">
      <div className="text-[0.875rem] font-bold tracking-[.12em] uppercase text-dim">{target === "avatar" ? "Posters" : "Backdrops"}</div>
      <div className={`grid gap-3 ${target === "avatar" ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-3"}`}>
        {choices.map((c) => (
          <button key={c.full} type="button" onClick={() => onPick(c)} aria-label={`Use this ${target === "avatar" ? "poster" : "backdrop"}`} className={`rounded-[8px] overflow-hidden bg-card-hi border border-hair hover:border-accent transition-colors cursor-pointer ${target === "avatar" ? "aspect-[2/3]" : "aspect-video"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

// The crop, as the app's CropSheet draws it: the picture under a frame (a
// circle for the photo, the banner's card), dimmed outside it; drag to move
// and pinch, scroll or slide to zoom, from filling the frame to five times
// that, never so far that an edge shows inside the frame. Saving draws the
// framed part at the app's size and hands back the JPEG as base64.
type View = { cx: number; cy: number; zoom: number };
const MARGIN = 24;

function Crop({ src, remote, target, busy, onCancel, onSave, onProblem }: { src: string; remote: boolean; target: PictureTarget; busy: boolean; onCancel: () => void; onSave: (jpeg: string) => void; onProblem: (text: string) => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState(0);
  const [view, setView] = useState<View | null>(null);
  const [making, setMaking] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = new Image();
    if (remote) el.crossOrigin = "anonymous";
    el.decoding = "async";
    el.onload = () => {
      setImg(el);
      setView({ cx: el.naturalWidth / 2, cy: el.naturalHeight / 2, zoom: 1 });
    };
    el.onerror = () => setFailed(true);
    el.src = src;
    return () => {
      el.onload = null;
      el.onerror = null;
    };
  }, [src, remote]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The frame inside the stage, and the zoom at which the picture just fills it.
  const geo = useMemo(() => {
    if (!img || width <= 0) return null;
    const fw = target === "avatar" ? Math.min(width - MARGIN * 2, 320) : width - 32;
    const fh = target === "avatar" ? fw : fw / BANNER_ASPECT;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    return { fw, fh, iw, ih, base: Math.max(fw / iw, fh / ih), h: fh + MARGIN * 2 };
  }, [img, width, target]);

  // Kept inside the picture: the frame's half-size in picture pixels from each edge.
  const clamp = useCallback(
    (v: View): View => {
      if (!geo) return v;
      const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
      const s = geo.base * zoom;
      const hx = geo.fw / 2 / s;
      const hy = geo.fh / 2 / s;
      return { zoom, cx: Math.min(geo.iw - hx, Math.max(hx, v.cx)), cy: Math.min(geo.ih - hy, Math.max(hy, v.cy)) };
    },
    [geo],
  );
  const shown = view && geo ? clamp(view) : null;

  // Zoom about a point given from the stage's centre, in screen pixels: the
  // spot under it stays under it.
  const zoomAt = useCallback(
    (factor: number, px = 0, py = 0) =>
      setView((v) => {
        if (!v || !geo) return v;
        const c = clamp(v);
        const s = geo.base * c.zoom;
        const zoom = Math.min(MAX_ZOOM, Math.max(1, c.zoom * factor));
        const s2 = geo.base * zoom;
        return clamp({ zoom, cx: c.cx + px / s - px / s2, cy: c.cy + py / s - py / s2 });
      }),
    [geo, clamp],
  );
  const pan = useCallback(
    (dx: number, dy: number) =>
      setView((v) => {
        if (!v || !geo) return v;
        const c = clamp(v);
        const s = geo.base * c.zoom;
        return clamp({ ...c, cx: c.cx - dx / s, cy: c.cy - dy / s });
      }),
    [geo, clamp],
  );

  // Scrolling zooms; a listener of its own so the page underneath doesn't scroll.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Dragging with a mouse or a finger; two fingers pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onMove = (e: React.PointerEvent) => {
    const all = pointers.current;
    const was = all.get(e.pointerId);
    if (!was) return;
    if (all.size === 1) {
      pan(e.clientX - was.x, e.clientY - was.y);
    } else if (all.size === 2) {
      const other = [...all.entries()].find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(was.x - other.x, was.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const r = e.currentTarget.getBoundingClientRect();
      const mx = (e.clientX + other.x) / 2 - r.left - r.width / 2;
      const my = (e.clientY + other.y) / 2 - r.top - r.height / 2;
      if (before > 0) zoomAt(after / before, mx, my);
      pan((e.clientX - was.x) / 2, (e.clientY - was.y) / 2);
    }
    all.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = 12;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      pan(...moves[e.key]);
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomAt(1.1);
    } else if (e.key === "-") {
      e.preventDefault();
      zoomAt(1 / 1.1);
    }
  };

  async function save() {
    if (!img || !geo || !shown) return;
    setMaking(true);
    try {
      const s = geo.base * shown.zoom;
      const sw = geo.fw / s;
      const sh = geo.fh / s;
      const k = Math.min(1, LONGEST[target] / Math.max(sw, sh));
      const outW = Math.max(1, Math.round(sw * k));
      const outH = target === "avatar" ? outW : Math.max(1, Math.round(outW / BANNER_ASPECT));
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, shown.cx - sw / 2, shown.cy - sh / 2, sw, sh, 0, 0, outW, outH);
      const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", QUALITY));
      if (!blob) throw new Error("no blob");
      const base64 = await new Promise<string>((done, fail) => {
        const reader = new FileReader();
        reader.onload = () => done(String(reader.result).replace(/^data:[^,]*,/, ""));
        reader.onerror = () => fail(reader.error);
        reader.readAsDataURL(blob);
      });
      setMaking(false);
      onSave(base64);
    } catch {
      setMaking(false);
      onProblem("Couldn't use that picture. Try another.");
    }
  }

  const s = geo && shown ? geo.base * shown.zoom : 0;
  return (
    <div className="flex flex-col min-h-0 overflow-y-auto soft-scroll">
      <div
        ref={stage}
        tabIndex={0}
        role="application"
        aria-label={target === "avatar" ? "Frame your photo: drag to move, scroll or pinch to zoom, or use the arrow keys and plus and minus" : "Frame your banner: drag to move, scroll or pinch to zoom, or use the arrow keys and plus and minus"}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
        className="relative w-full overflow-hidden bg-black select-none touch-none cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
        style={{ height: geo ? geo.h : target === "avatar" ? 320 : 220 }}
      >
        {failed ? (
          <p className="absolute inset-0 m-0 p-4 flex items-center justify-center text-center text-[1.0417rem] text-white/80">That picture couldn&apos;t be opened. Try a JPEG or PNG.</p>
        ) : !geo || !shown ? (
          <p className="absolute inset-0 m-0 flex items-center justify-center text-[1.0417rem] text-white/70">Loading…</p>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              crossOrigin={remote ? "anonymous" : undefined}
              alt=""
              draggable={false}
              className="absolute max-w-none pointer-events-none"
              style={{ width: geo.iw * s, height: geo.ih * s, left: width / 2 - shown.cx * s, top: geo.h / 2 - shown.cy * s }}
            />
            <div
              aria-hidden
              className="absolute pointer-events-none border border-white/80"
              style={{
                width: geo.fw,
                height: geo.fh,
                left: (width - geo.fw) / 2,
                top: MARGIN,
                borderRadius: target === "avatar" ? "50%" : 12,
                boxShadow: "0 0 0 9999px rgba(0,0,0,.6)",
              }}
            />
          </>
        )}
      </div>

      <div className="p-4 grid gap-3">
        <label className="flex items-center gap-3">
          <span className="text-[0.875rem] font-bold tracking-[.12em] uppercase text-dim shrink-0">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={shown?.zoom ?? 1}
            disabled={!shown}
            onChange={(e) => {
              const z = Number(e.target.value);
              setView((v) => (v ? clamp({ ...v, zoom: z }) : v));
            }}
            aria-label="Zoom"
            className="flex-1 min-w-0 accent-[color:var(--accent-fill)]"
          />
        </label>
        <p className="m-0 text-[1.0417rem] text-dim text-center">Drag to move · pinch or scroll to zoom</p>
        <div className="flex items-center justify-end gap-2">
          <button type="button" className={PILL} onClick={onCancel} disabled={making || busy}>
            Cancel
          </button>
          <button type="button" className={PRIMARY} onClick={save} disabled={!shown || making || busy}>
            {making || busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
