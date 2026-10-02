"use client";

import { EDIT_ABOUT } from "./ProfileAbout";
import { useState } from "react";
import { Menu } from "./Menu";
import { HANDLE, LINE } from "./FollowPill";
import { BlockIcon, BlockSheet, FlagIcon, ReportSheet } from "./SafetySheets";
import { setViewAsOthers, useViewAsOthers } from "@/lib/privacy";
import { unblock, useBlocked } from "@/lib/safety";

// The ⋯ beside Follow on a profile: copy the profile's link, and for someone
// else's profile, block or report them (SafetySheets). Letterboxd's QR code
// is left out until there is one to show.
export function ProfileMenu({ username, owner }: { username: string; owner: boolean }) {
  const [said, setSaid] = useState<string | null>(null);
  const others = useViewAsOthers();
  const blocked = useBlocked(username);
  const [sheet, setSheet] = useState<"report" | "block" | null>(null);
  function say(text: string) {
    setSaid(text);
    setTimeout(() => setSaid(null), 2400);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(`/u/${username}`, location.origin).href);
      say("Profile link copied");
    } catch {
      say("Couldn't copy the link");
    }
  }
  const item = "w-full flex items-center gap-3 px-4 py-2.5 text-[1.125rem] text-ink hover:bg-card-hi cursor-pointer text-left";
  return (
    <div className="relative" style={{ marginTop: `calc(${HANDLE} * -0.1)` }}>
      <Menu
        label="More"
        width={230}
        button={
          <span className="inline-flex items-center justify-center rounded-full border border-hair text-dim hover:text-ink transition-colors" style={{ width: LINE, height: LINE }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="1.9" />
              <circle cx="12" cy="12" r="1.9" />
              <circle cx="19" cy="12" r="1.9" />
            </svg>
          </span>
        }
      >
        <div className="py-1.5">
          <button type="button" data-menu-close onClick={copy} className={item}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-dim">
              <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
              <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
            </svg>
            Copy profile link
          </button>
          {/* The profile as a 1080 × 1920 picture for a story
              (app/u/[username]/story), for owner and visitors alike. */}
          <a href={`/u/${username}/story?download=1`} download={`kodigo-${username}.png`} data-menu-close className={`${item} no-underline`}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-dim">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            Download story image
          </a>
          {owner && (
            // The card's location, quote and links, edited in place.
            <button type="button" data-menu-close onClick={() => window.dispatchEvent(new Event(EDIT_ABOUT))} className={item}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-dim">
                <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
              </svg>
              Edit location, quote and links
            </button>
          )}
          {owner && (
            // Their privacy settings, seen from outside.
            <button type="button" data-menu-close onClick={() => setViewAsOthers(!others)} className={item}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-dim">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {others ? "Back to your own view" : "See your profile as others do"}
            </button>
          )}
          {!owner && (
            <>
              <div className="my-1.5 border-t border-hair" />
              <button type="button" data-menu-close onClick={() => (blocked ? (unblock(username), say(`Unblocked @${username}`)) : setSheet("block"))} className={item}>
                <BlockIcon />
                {blocked ? "Unblock this member" : "Block this member"}
              </button>
              <button type="button" data-menu-close onClick={() => setSheet("report")} className={item}>
                <FlagIcon />
                Report this member
              </button>
            </>
          )}
        </div>
      </Menu>
      {sheet === "report" && <ReportSheet what={{ kind: "profile", target: username, author: username, href: `/u/${username}`, excerpt: "" }} onClose={() => setSheet(null)} />}
      {sheet === "block" && <BlockSheet username={username} onClose={() => setSheet(null)} />}
      {said && (
        <span role="status" className="absolute right-0 top-[calc(100%+8px)] z-50 whitespace-nowrap rounded-full bg-card-hi border border-hair px-3 py-1 text-[1rem] text-ink shadow-lg">
          {said}
        </span>
      )}
    </div>
  );
}
