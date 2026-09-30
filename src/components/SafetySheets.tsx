"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Menu } from "./Menu";
import { REPORT_REASONS, block, unblock, useBlocked, useSafety, type ReportKind, type ReportReason } from "@/lib/safety";
import { fileReport } from "@/lib/safety-actions";

// Reporting and blocking (docs/social-plan.md, step 6): the sheets, and the
// ⋯ menu that opens them from a review, a comment or a list. A profile's own
// ⋯ (ProfileMenu) opens the same sheets.

export interface ReportTarget {
  kind: ReportKind;
  /** The thing's id: a review key, comment id, list id, or the username for a profile. */
  target: string;
  author: string;
  href: string;
  excerpt: string;
}

const NOUN: Record<ReportKind, string> = { review: "review", comment: "comment", list: "list", profile: "member" };

function Sheet({ label, onClose, busy = false, children }: { label: string; onClose: () => void; busy?: boolean; children: React.ReactNode }) {
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={() => !busy && onClose()}>
      <div className="w-full sm:max-w-[480px] max-h-[92vh] overflow-y-auto rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-shell bg-piece p-4 grid gap-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

const quiet = "h-9 px-4 rounded-full bg-card border border-hair text-[12.5px] font-semibold text-ink cursor-pointer disabled:opacity-40 disabled:cursor-default";
const strong = "h-9 px-4 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default";
const danger = "h-9 px-4 rounded-full bg-loved text-white text-[12.5px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default";

/** Report: why, a note if they like, then thanks and the offer to block. */
export function ReportSheet({ what, onClose }: { what: ReportTarget; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [blockNext, setBlockNext] = useState(false);
  const blocked = useBlocked(what.author);
  const noun = NOUN[what.kind];

  if (blockNext) return <BlockSheet username={what.author} onClose={onClose} />;

  async function send() {
    if (!reason) return;
    setBusy(true);
    setError(null);
    const r = await fileReport({ ...what, reason, note: note.trim() }).catch(() => ({ saved: false, error: "That didn't send. Try again." }));
    if (r.error) {
      setError(r.error);
      setBusy(false);
      return;
    }
    setSent(true);
    setBusy(false);
  }

  return (
    <Sheet label={`Report this ${noun}`} onClose={onClose} busy={busy}>
      {sent ? (
        <>
          <h3 className="!text-[clamp(24px,2.6vw,30px)] !leading-none uppercase">Thanks for telling us</h3>
          <p className="m-0 text-[12.5px] leading-[1.6] text-mid-tone">
            We&apos;ll look at it and act if it breaks the <a href="/terms#community-rules" className="text-accent no-underline hover:underline">community rules</a>. @{what.author} isn&apos;t told who reported them.
          </p>
          <p className="m-0 text-[12.5px] leading-[1.6] text-dim">If someone is in danger, contact your local emergency services first.</p>
          <div className="flex justify-end gap-2">
            {!blocked && (
              <button type="button" onClick={() => setBlockNext(true)} className={quiet}>
                Block @{what.author}
              </button>
            )}
            <button type="button" onClick={onClose} className={strong}>
              Done
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="!text-[clamp(24px,2.6vw,30px)] !leading-none uppercase">Report this {noun}</h3>
          {what.excerpt && <p className="m-0 text-[12.5px] leading-[1.6] text-dim line-clamp-2">&ldquo;{what.excerpt}&rdquo;</p>}
          <div role="radiogroup" aria-label="What's wrong?" className="grid gap-1">
            {REPORT_REASONS.filter(([id]) => !(id === "spoilers" && what.kind === "profile")).map(([id, label, hint]) => {
              const on = reason === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setReason(id)}
                  className={`text-left rounded-[10px] px-3 py-2 flex items-start gap-3 cursor-pointer ${on ? "bg-card ring-[1.5px] ring-inset ring-accent-fill" : "hover:bg-card"}`}
                >
                  <span aria-hidden className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-[1.5px] flex items-center justify-center ${on ? "border-accent-fill" : "border-hair"}`}>
                    {on && <span className="w-2 h-2 rounded-full bg-accent-fill" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-ink">{label}</span>
                    <span className="block text-[12.5px] leading-[1.5] text-dim">{hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <label className="grid gap-1.5 text-[12.5px] text-dim">
            {reason === "other" ? "What's wrong?" : "Anything we should know? (optional)"}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
              className="rounded-[10px] bg-card border border-hair px-2.5 py-1.5 text-[12.5px] leading-[1.5] text-ink resize-none focus:outline-none focus:border-accent"
            />
          </label>
          {error && (
            <p role="alert" className="m-0 text-[12.5px] text-loved">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={onClose} className={quiet}>
              Cancel
            </button>
            <button type="button" disabled={!reason || busy || (reason === "other" && !note.trim())} onClick={send} className={strong}>
              {busy ? "Sending…" : "Send report"}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

/** Block: what it does, then do it. Unblocking needs no sheet. */
export function BlockSheet({ username, onClose }: { username: string; onClose: () => void }) {
  return (
    <Sheet label={`Block @${username}?`} onClose={onClose}>
      <h3 className="!text-[clamp(24px,2.6vw,30px)] !leading-none uppercase">Block @{username}?</h3>
      <ul className="m-0 pl-4 grid gap-1 text-[12.5px] leading-[1.6] text-mid-tone list-disc">
        <li>You won&apos;t see their profile, reviews, lists or comments, and they won&apos;t see yours.</li>
        <li>They can&apos;t follow you, like your things or comment on them.</li>
        <li>If either of you follows the other, that ends.</li>
        <li>They aren&apos;t told. Unblock any time in Settings → Privacy.</li>
      </ul>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={quiet}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            block(username);
            onClose();
          }}
          className={danger}
        >
          Block
        </button>
      </div>
    </Sheet>
  );
}

/** The ⋯ on a review, comment or list: report it, or block (or unblock) whoever posted it. */
export function MoreButton({ what, className = "" }: { what: ReportTarget; className?: string }) {
  const [sheet, setSheet] = useState<"report" | "block" | null>(null);
  const blocked = useBlocked(what.author);
  useSafety();
  const item = "w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-card-hi cursor-pointer text-left";
  return (
    <span className={className}>
      <Menu
        label={`More for this ${NOUN[what.kind]}`}
        width={220}
        button={
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-dim hover:text-ink hover:bg-card transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="1.9" />
              <circle cx="12" cy="12" r="1.9" />
              <circle cx="19" cy="12" r="1.9" />
            </svg>
          </span>
        }
      >
        <div className="py-1.5">
          <button type="button" data-menu-close onClick={() => setSheet("report")} className={item}>
            <FlagIcon />
            Report this {NOUN[what.kind]}
          </button>
          <button type="button" data-menu-close onClick={() => (blocked ? unblock(what.author) : setSheet("block"))} className={item}>
            <BlockIcon />
            {blocked ? "Unblock" : "Block"} @{what.author}
          </button>
        </div>
      </Menu>
      {sheet === "report" && <ReportSheet what={what} onClose={() => setSheet(null)} />}
      {sheet === "block" && <BlockSheet username={what.author} onClose={() => setSheet(null)} />}
    </span>
  );
}

export function FlagIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-dim shrink-0">
      <path d="M5.5 21V4M5.5 4.5h11l-2.5 4 2.5 4h-11" />
    </svg>
  );
}

export function BlockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="text-dim shrink-0">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 18L18 6" />
    </svg>
  );
}

/** Hides what a blocked person posted. */
export function Unblocked({ username, children }: { username: string; children: React.ReactNode }) {
  return useBlocked(username) ? null : <>{children}</>;
}

/** On a blocked person's profile, in place of it. */
export function BlockGate({ username, bare = false, children }: { username: string; /** Already inside the page's padded main. */ bare?: boolean; children: React.ReactNode }) {
  const blocked = useBlocked(username);
  if (!blocked) return <>{children}</>;
  return (
    <div className={bare ? "" : "px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1"}>
      <div className="max-w-[520px] mx-auto rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]">
        <div className="rounded-shell bg-piece p-4 grid gap-3">
          <h1 className="!text-[clamp(28px,3vw,36px)] !leading-none uppercase">You&apos;ve blocked @{username}</h1>
          <p className="m-0 text-[12.5px] leading-[1.6] text-mid-tone">You don&apos;t see their profile, reviews, lists or comments, and they don&apos;t see yours.</p>
          <div>
            <button type="button" onClick={() => unblock(username)} className={quiet}>
              Unblock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
