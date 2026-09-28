"use client";

import { useState } from "react";
import { Glyph } from "./Glyph";

// The show page's tray, the app's five keys under the header card: More,
// Stop watching, the alarm, the heart and Add. Stop and the alarm only mean
// something for a show in the library, so they are faint until then. Once
// tracked, Add becomes the blue bookmark, or a check when everything aired
// has been watched.
//
// Tracking from the website opens with accounts; until then a press says so.
export function ShowTray({ tracked, loved, allWatched, stopped }: { tracked: boolean; loved: boolean; allWatched: boolean; stopped: boolean }) {
  const [note, setNote] = useState(false);
  const key = "h-10 rounded-[10px] bg-piece text-dim flex items-center justify-center cursor-pointer";
  const say = () => setNote(true);
  return (
    <div className="grid gap-1.5">
      <div className="grid grid-cols-5 gap-2">
        <button type="button" onClick={say} aria-label="More" className={key}>
          <Glyph name="ellipsis" />
        </button>
        <button type="button" onClick={say} aria-label="Stop watching" disabled={!tracked} className={`${key} ${stopped ? "!bg-[#D69570] !text-[#F0EFE9]" : ""} disabled:opacity-35 disabled:cursor-default`}>
          <Glyph name="pause" />
        </button>
        <button type="button" onClick={say} aria-label="Alerts" disabled={!tracked} className={`${key} ${tracked ? "!bg-[#D9BC52] !text-[#5A4200]" : ""} disabled:opacity-35 disabled:cursor-default`}>
          <Glyph name="bell" />
        </button>
        <button type="button" onClick={say} aria-label="Favourite" className={`${key} ${loved ? "!bg-[#CF8DB5] !text-[#F0EFE9]" : ""}`}>
          <Glyph name={loved ? "heart-fill" : "heart"} />
        </button>
        <button type="button" onClick={say} aria-label={tracked ? "In your library" : "Add"} className={`${key} ${tracked ? "!bg-[#6FAECF] !text-[#F0EFE9]" : ""}`}>
          <Glyph name={!tracked ? "plus" : allWatched ? "check" : "bookmark"} />
        </button>
      </div>
      {note && <p className="m-0 text-center text-[12px] text-dim">Tracking on the website opens with accounts. Until then, use the app.</p>}
    </div>
  );
}
