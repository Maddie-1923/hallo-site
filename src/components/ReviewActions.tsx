"use client";

import { useEffect, useState } from "react";
import { likeInfo, setLike } from "@/lib/social-actions";
import { TightHeart } from "./marks";
import { MoreButton, type ReportTarget } from "./SafetySheets";

// Under a review: like it, see its comments, share it. The like only changes
// the page until likes are stored (docs/social-plan.md, step 4.2); comments
// and sharing arrive with their own steps and are drawn now to judge the row.
// The ⋯ at the end reports the review or blocks whoever wrote it.
// With `owner` and `reviewKey` (a real member's review), the counts come from
// the account and the heart saves; the comment count opens the review's
// page, where the thread is. Without them, the preview's made-up counts.
export function ReviewActions({ likes = 0, comments = 0, title, shareHref, what, owner, reviewKey, className = "mt-3" }: { likes?: number; comments?: number; title: string; shareHref?: string; what?: ReportTarget; owner?: string; reviewKey?: string; className?: string }) {
  const [liked, setLiked] = useState(false);
  const [live, setLive] = useState<{ count: number; liked: boolean; comments: number } | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    if (!owner || !reviewKey) return;
    let stale = false;
    likeInfo("review", owner, reviewKey)
      .then((r) => !stale && r && setLive(r))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [owner, reviewKey]);
  async function toggleLike() {
    if (!live || !owner || !reviewKey) return setLiked((l) => !l);
    const before = live;
    const on = !live.liked;
    setLive({ ...live, liked: on, count: live.count + (on ? 1 : -1) });
    const r = await setLike("review", owner, reviewKey, on).catch(() => ({ ok: false, error: "That didn't work. Try again." }) as { ok: boolean; error?: string });
    if (!r.ok) {
      setLive(before);
      if (r.error) {
        setSaid(r.error);
        setTimeout(() => setSaid(null), 3000);
      }
    }
  }
  const [copied, setCopied] = useState(false);
  // Share hands out the review's own page. Where the device has a share
  // sheet (phones, Safari) that opens; elsewhere the link is copied.
  async function share() {
    if (!shareHref) return;
    const url = new URL(shareHref, location.origin).href;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: `A review of ${title} on Kodigo` });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }
  const count = live ? live.count : likes + (liked ? 1 : 0);
  const isLiked = live ? live.liked : liked;
  const commentCount = live ? live.comments : comments;
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] ${className}`}>
      <button
        type="button"
        aria-pressed={isLiked}
        onClick={toggleLike}
        className={`inline-flex items-center gap-1.5 font-semibold cursor-pointer transition-colors ${isLiked ? "text-loved" : "text-dim hover:text-ink"}`}
        aria-label={isLiked ? `Unlike the review of ${title}` : `Like the review of ${title}`}
      >
        <TightHeart size={14} />
        {/* The heart alone says what the button does; its aria-label says it
            in words for a screen reader. */}
        <span className={`font-normal ${isLiked ? "" : "text-dim"}`}>
          {count} {count === 1 ? "like" : "likes"}
        </span>
      </button>
      <a href={shareHref ? `${shareHref}#comments` : undefined} className="inline-flex items-center gap-1.5 text-dim no-underline hover:text-ink">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" />
        </svg>
        {commentCount} {commentCount === 1 ? "comment" : "comments"}
      </a>
      <button type="button" onClick={share} disabled={!shareHref} className="inline-flex items-center gap-1.5 text-dim enabled:hover:text-ink enabled:cursor-pointer transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14" />
        </svg>
        {copied ? "Link copied" : "Share"}
      </button>
      {said && (
        <span role="alert" className="text-[12px] text-loved">
          {said}
        </span>
      )}
      {what && <MoreButton what={what} className="ml-auto -my-1" />}
    </div>
  );
}
