"use client";

import { useState } from "react";

/** Share this page: the phone's share sheet, or the link copied. */
export function ShareLink({ title, className = "" }: { title: string; className?: string }) {
  const [said, setSaid] = useState<string | null>(null);
  async function share() {
    const url = location.href.split("#")[0];
    try {
      if (navigator.share) await navigator.share({ url, title });
      else {
        await navigator.clipboard.writeText(url);
        setSaid("Link copied");
        setTimeout(() => setSaid(null), 2400);
      }
    } catch {}
  }
  return (
    <button type="button" onClick={share} className={`inline-flex items-center gap-2 h-9 px-4 rounded-full bg-accent-fill text-on-accent text-[1.0417rem] font-semibold cursor-pointer hover:brightness-110 ${className}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
      {said ?? "Share"}
    </button>
  );
}
