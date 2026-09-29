"use client";

import { useState } from "react";
import { TightHeart } from "./marks";
import { MoreButton, type ReportTarget } from "./SafetySheets";

// Under a review: like it, see its comments, share it. The like only changes
// the page until likes are stored (docs/social-plan.md, step 4.2); comments
// and sharing arrive with their own steps and are drawn now to judge the row.
// The ⋯ at the end reports the review or blocks whoever wrote it.
export function ReviewActions({ likes = 0, comments = 0, title, shareHref, what, className = "mt-3" }: { likes?: number; comments?: number; title: string; shareHref?: string; what?: ReportTarget; className?: string }) {
  const [liked, setLiked] = useState(false);
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
  const count = likes + (liked ? 1 : 0);
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] ${className}`}>
      <button
        type="button"
        aria-pressed={liked}
        onClick={() => setLiked((l) => !l)}
        className={`inline-flex items-center gap-1.5 font-semibold cursor-pointer transition-colors ${liked ? "text-loved" : "text-dim hover:text-ink"}`}
        aria-label={liked ? `Unlike the review of ${title}` : `Like the review of ${title}`}
      >
        <TightHeart size={14} />
        {/* The heart alone says what the button does; its aria-label says it
            in words for a screen reader. */}
        <span className={`font-normal ${liked ? "" : "text-dim"}`}>
          {count} {count === 1 ? "like" : "likes"}
        </span>
      </button>
      <span className="inline-flex items-center gap-1.5 text-dim">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" />
        </svg>
        {comments} {comments === 1 ? "comment" : "comments"}
      </span>
      <button type="button" onClick={share} disabled={!shareHref} className="inline-flex items-center gap-1.5 text-dim enabled:hover:text-ink enabled:cursor-pointer transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14" />
        </svg>
        {copied ? "Link copied" : "Share"}
      </button>
      {what && <MoreButton what={what} className="ml-auto -my-1" />}
    </div>
  );
}
