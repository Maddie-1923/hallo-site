"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MoreButton } from "./SafetySheets";
import { useDateFormat } from "./Day";
import { useSafety } from "@/lib/safety";
import { checkText } from "@/lib/word-filter";
import { deleteComment, gifsAvailable, loadComments, postComment, repliesClosed, type CommentView, type TargetKind } from "@/lib/social-actions";
import type { Gif } from "@/lib/klipy";
import { CommentGif, GifPicker } from "./GifPicker";

// Comments on a review or a list (docs/social-plan.md, step 4.3). On a real
// member's review or list they come from the account: the box posts through
// the server (the word filter again, a check the writer can see it, 30 an
// hour), the author or the owner of the review or list can delete one, and
// the ⋯ reports it or blocks whoever wrote it. Blocked people's comments
// never show. Signed out, the box is a link to sign in. A comment may carry
// one GIF from KLIPY, or be only a GIF (docs/gif-plan.md); the GIF button
// shows only while GIFs are switched on.
export function CommentThread({ kind, owner, target, href }: { kind: TargetKind; owner: string; target: string; href: string }) {
  const fmt = useDateFormat();
  const { blocked } = useSafety();
  const [live, setLive] = useState<CommentView[] | null>(null);
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A review's writer can turn replies off; the comments already there stay.
  const [closed, setClosed] = useState(false);
  const [gifsOn, setGifsOn] = useState(false);
  const [picking, setPicking] = useState(false);
  const [gif, setGif] = useState<Gif | null>(null);

  useEffect(() => {
    let stale = false;
    loadComments(kind, owner, target)
      .then((r) => !stale && r && setLive(r))
      .catch(() => {});
    gifsAvailable()
      .then((on) => !stale && setGifsOn(on))
      .catch(() => {});
    if (kind === "review")
      repliesClosed(owner, target)
        .then((c) => !stale && setClosed(c))
        .catch(() => {});
    return () => {
      stale = true;
    };
  }, [kind, owner, target]);

  const rows = (live ?? []).filter((c) => !blocked.includes(c.author.username)).map((c) => ({ id: c.id, who: c.author.username, text: c.body, gif: c.gif, when: fmt(c.at.slice(0, 10), "dayMonth"), canDelete: c.canDelete }));

  async function post() {
    const text = draft.trim();
    if (!text && !gif) return;
    const p = text ? checkText(text) : null;
    setProblem(p);
    if (p) return;
    setBusy(true);
    const r = await postComment(kind, owner, target, text, gif?.slug ?? null).catch(() => ({ ok: false, error: "That didn't post. Try again." }) as { ok: boolean; error?: string; comment?: CommentView });
    setBusy(false);
    if (!r.ok || !r.comment) return setProblem(r.error ?? "That didn't post. Try again.");
    setLive((l) => [...(l ?? []), r.comment!]);
    setDraft("");
    setGif(null);
    setPicking(false);
  }

  async function remove(id: string) {
    const before = live;
    setLive((l) => l?.filter((c) => c.id !== id) ?? l);
    const r = await deleteComment(id).catch(() => ({ ok: false }));
    if (!r.ok) setLive(before);
  }

  return (
    <div id="comments" className="rounded-shell bg-piece divide-y divide-hair scroll-mt-24">
      {rows.length === 0 && <p className="m-0 p-3 text-[1.0417rem] text-dim">No comments yet.</p>}
      {rows.map((c) => (
        <div key={c.id} className="flex items-start gap-3 p-3">
          <span className="shrink-0 w-8 h-8 rounded-full bg-accent-fill text-on-accent flex items-center justify-center display text-[1.25rem] leading-none pt-[2px]">{c.who[0]?.toUpperCase()}</span>
          <div className="min-w-0 flex-1 text-[1.0417rem] leading-[1.5]">
            <Link href={`/u/${c.who}`} className="font-semibold text-ink no-underline hover:text-accent">
              @{c.who}
            </Link>
            <span className="text-dim"> · {c.when}</span>
            {c.text && <p className="m-0 mt-0.5 text-mid-tone whitespace-pre-wrap break-words">{c.text}</p>}
            {c.gif && <CommentGif gif={c.gif} />}
          </div>
          {c.canDelete && (
            <button type="button" onClick={() => remove(c.id)} className="shrink-0 text-[1rem] text-dim hover:text-loved cursor-pointer">
              Delete
            </button>
          )}
          <MoreButton what={{ kind: "comment", target: c.id, author: c.who, href, excerpt: [c.text.slice(0, 200), c.gif ? `GIF: ${c.gif.url}` : ""].filter(Boolean).join(" ") }} className="shrink-0 -my-1" />
        </div>
      ))}
      {!live ? (
        <p className="m-0 p-3 text-[1.0417rem] text-dim">
          <Link href={`/login?next=${encodeURIComponent(href)}`} className="text-accent font-semibold no-underline hover:underline">
            Sign in
          </Link>{" "}
          to comment.
        </p>
      ) : closed ? (
        <p className="m-0 p-3 text-[1.0417rem] text-dim">Replies are off for this review.</p>
      ) : (
      <form
        className="p-3 grid gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void post();
        }}
      >
        {gif && (
          <div className="relative w-fit">
            <CommentGif gif={gif} />
            <button type="button" onClick={() => setGif(null)} aria-label="Remove the GIF" className="absolute top-2.5 right-1 w-7 h-7 rounded-full bg-black/55 text-white cursor-pointer">
              ✕
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          {gifsOn && (
            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              aria-expanded={picking}
              aria-label="Add a GIF"
              className={`shrink-0 h-9 px-3 rounded-full border text-[.9375rem] font-bold tracking-[.04em] cursor-pointer ${picking || gif ? "border-accent text-accent" : "border-hair text-dim hover:text-ink"}`}
            >
              GIF
            </button>
          )}
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value.slice(0, 1000));
              setProblem(null);
            }}
            rows={1}
            aria-invalid={!!problem}
            aria-label="Add a comment"
            placeholder="Add a comment"
            className={`flex-1 min-w-0 rounded-[18px] bg-card border px-4 py-2 text-[1.0417rem] leading-[1.5] text-ink placeholder:text-dim resize-y min-h-[3.1667rem] max-h-[16.6667rem] focus:outline-none ${problem ? "border-loved" : "border-hair focus:border-accent"}`}
          />
          <button type="submit" disabled={(!draft.trim() && !gif) || busy} className="h-9 px-4 rounded-full bg-accent-fill text-on-accent text-[1.0417rem] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default">
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
        {picking && (
          <GifPicker
            onPick={(g) => {
              setGif(g);
              setPicking(false);
              setProblem(null);
            }}
            onClose={() => setPicking(false)}
          />
        )}
        {problem && (
          <p role="alert" className="m-0 px-4 text-[1.0417rem] text-loved">
            {problem}
          </p>
        )}
      </form>
      )}
    </div>
  );
}
