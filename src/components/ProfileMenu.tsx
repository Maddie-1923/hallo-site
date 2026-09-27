"use client";

import { useState } from "react";
import { Menu } from "./Menu";
import { HANDLE, LINE } from "./FollowPill";

// The ⋯ beside Follow on a profile: copy the profile's link, and for someone
// else's profile, block or report them. Blocking and reporting arrive with
// accounts and the safety step (docs/social-plan.md, step 6); until then they
// say so. Letterboxd's QR code is left out until there is one to show.
export function ProfileMenu({ username, owner }: { username: string; owner: boolean }) {
  const [said, setSaid] = useState<string | null>(null);
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
  const item = "w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-ink hover:bg-card-hi cursor-pointer text-left";
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
          {!owner && (
            <>
              <div className="my-1.5 border-t border-hair" />
              <button type="button" data-menu-close onClick={() => say("Blocking comes with accounts")} className={item}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="text-dim">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M6 18L18 6" />
                </svg>
                Block this member
              </button>
              <button type="button" data-menu-close onClick={() => say("Reporting comes with accounts")} className={item}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-dim">
                  <path d="M5.5 21V4M5.5 4.5h11l-2.5 4 2.5 4h-11" />
                </svg>
                Report this member
              </button>
            </>
          )}
        </div>
      </Menu>
      {said && (
        <span role="status" className="absolute right-0 top-[calc(100%+8px)] z-50 whitespace-nowrap rounded-full bg-card-hi border border-hair px-3 py-1 text-[12px] text-ink shadow-lg">
          {said}
        </span>
      )}
    </div>
  );
}
