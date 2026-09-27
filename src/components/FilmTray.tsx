"use client";

import { useState } from "react";
import { Glyph } from "./Glyph";

// The film page's keys, as the app's bottom bar has them. A film not in the
// library gets the one wide Add pill; a tracked film gets the tray: More,
// Rewatch (only once it's watched), the heart, and Watched across two
// widths. On the web the header card carries them as its last piece rather
// than a bar pinned to the bottom of the window.
//
// Tracking from the website opens with accounts (docs/social-plan.md, step
// 2); until then the pill says so rather than doing nothing.
export function FilmTray({ tracked, watched, loved, signedIn }: { tracked: boolean; watched: boolean; loved: boolean; signedIn: boolean }) {
  const [note, setNote] = useState(false);
  if (!tracked || !signedIn) {
    return (
      <div className="grid gap-1.5">
        <button
          type="button"
          onClick={() => setNote(true)}
          className="h-11 rounded-full border-[1.5px] border-accent-fill text-accent text-[15px] font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-accent-fill hover:text-on-accent transition-colors"
        >
          <Glyph name="plus" size={16} />
          Add
        </button>
        {note && <p className="m-0 text-center text-[12px] text-dim">Tracking on the website opens with accounts. Until then, add it in the app.</p>}
      </div>
    );
  }
  const key = "h-10 rounded-[10px] bg-piece text-dim flex items-center justify-center";
  return (
    <div className="grid grid-cols-5 gap-2">
      <span className={key} title="More">
        <Glyph name="ellipsis" />
      </span>
      <span className={`${key} ${watched ? "" : "opacity-35"}`} title="Rewatch">
        <Glyph name="repeat" />
      </span>
      <span className={loved ? `${key} !bg-[#CF8DB5] !text-[#F0EFE9]` : key} title="Favourite">
        <Glyph name={loved ? "heart-fill" : "heart"} />
      </span>
      <span className={`col-span-2 ${key} gap-1.5 text-[15px] font-semibold ${watched ? "!bg-accent-fill !text-on-accent" : ""}`}>
        {watched && <Glyph name="check-circle" size={17} />}
        Watched
      </span>
    </div>
  );
}
