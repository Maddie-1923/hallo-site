"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MoreButton } from "./SafetySheets";
import { useDateFormat } from "./Day";
import { useSafety } from "@/lib/safety";
import { checkText } from "@/lib/word-filter";
import { deleteComment, loadComments, postComment, type CommentView, type TargetKind } from "@/lib/social-actions";

// Comments on a review or a list (docs/social-plan.md, step 4.3). On a real
// member's review or list they come from the account: the box posts through
// the server (the word filter again, a check the writer can see it, 30 an
// hour), the author or the owner of the review or list can delete one, and
// the ⋯ reports it or blocks whoever wrote it. Blocked people's comments
// never show. Before accounts, `sample` stands in and posting only adds to
// the page, after the same filter.
export function CommentThread({ kind, owner, target, href, sample = [] }: { kind: TargetKind; owner: string; target: string; href: string; sample?: { who: string; text: string; ago: string }[] }) {
  const fmt = useDateFormat();
  const { blocked } = useSafety();
  const [live, setLive] = useState<CommentView[] | null>(null);
  const [local, setLocal] = useState<{ who: string; text: string; ago: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stale = false;
    loadComments(kind, owner, target)
      .then((r) => !stale && r && setLive(r))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [kind, owner, target]);

  const rows = live
    ? live.filter((c) => !blocked.includes(c.author.username)).map((c) => ({ id: c.id, who: c.author.username, text: c.body, when: fmt(c.at.slice(0, 10), "dayMonth"), canDelete: c.canDelete }))
    : [...sample, ...local].filter((c) => !blocked.includes(c.who)).map((c, i) => ({ id: `s${i}`, who: c.who, text: c.text, when: c.ago, canDelete: false }));

  async function post() {
    const text = draft.trim();
    if (!text) return;
    const p = checkText(text);
    setProblem(p);
    if (p) return;
    if (!live) {
      setLocal((l) => [...l, { who: "you", text, ago: "just now" }]);
      setDraft("");
      return;
    }
    setBusy(true);
    const r = await postComment(kind, owner, target, text).catch(() => ({ ok: false, error: "That didn't post. Try again." }) as { ok: boolean; error?: string; comment?: CommentView });
    setBusy(false);
    if (!r.ok || !r.comment) return setProblem(r.error ?? "That didn't post. Try again.");
    setLive((l) => [...(l ?? []), r.comment!]);
    setDraft("");
  }

  async function remove(id: string) {
    const before = live;
    setLive((l) => l?.filter((c) => c.id !== id) ?? l);
    const r = await deleteComment(id).catch(() => ({ ok: false }));
    if (!r.ok) setLive(before);
  }

  return (
    <div id="comments" className="rounded-shell bg-piece divide-y divide-hair scroll-mt-24">
      {rows.length === 0 && <p className="m-0 p-3 text-[12.5px] text-dim">No comments yet.</p>}
      {rows.map((c) => (
        <div key={c.id} className="flex items-start gap-3 p-3">
          <span className="shrink-0 w-8 h-8 rounded-full bg-accent-fill text-on-accent flex items-center justify-center display text-[15px] leading-none pt-[2px]">{c.who[0]?.toUpperCase()}</span>
          <div className="min-w-0 flex-1 text-[12.5px] leading-[1.5]">
            <Link href={`/u/${c.who}`} className="font-semibold text-ink no-underline hover:text-accent">
              @{c.who}
            </Link>
            <span className="text-dim"> · {c.when}</span>
            <p className="m-0 mt-0.5 text-mid-tone whitespace-pre-wrap break-words">{c.text}</p>
          </div>
          {c.canDelete && (
            <button type="button" onClick={() => remove(c.id)} className="shrink-0 text-[12px] text-dim hover:text-loved cursor-pointer">
              Delete
            </button>
          )}
          {c.who !== "you" && <MoreButton what={{ kind: "comment", target: c.id, author: c.who, href, excerpt: c.text.slice(0, 200) }} className="shrink-0 -my-1" />}
        </div>
      ))}
      <form
        className="p-3 grid gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void post();
        }}
      >
        <div className="flex items-end gap-2">
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
            className={`flex-1 min-w-0 rounded-[18px] bg-card border px-4 py-2 text-[12.5px] leading-[1.5] text-ink placeholder:text-dim resize-y min-h-[38px] max-h-[200px] focus:outline-none ${problem ? "border-loved" : "border-hair focus:border-accent"}`}
          />
          <button type="submit" disabled={!draft.trim() || busy} className="h-9 px-4 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default">
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
        {problem && (
          <p role="alert" className="m-0 px-4 text-[12.5px] text-loved">
            {problem}
          </p>
        )}
      </form>
    </div>
  );
}
