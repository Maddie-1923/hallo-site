"use client";

import { useState } from "react";

// Follow, drawn the way the app draws its status tags (New, Premiere): a
// small filled chip with a small corner, in the theme's accent with its
// lettering. In ordinary case rather than the tags' capitals: capitals read a
// size too big beside the followers line at every size down to 8px, and 11px
// lowercase stands at about the height those 8px capitals did. "+ Follow" until you
// follow, "Following" after.
//
// Nothing is saved yet: follows arrive with the public tables and accounts
// (docs/social-plan.md, step 4). Until then the chip only changes its own
// label, which is enough to see both states on the preview pages.
export function FollowPill({ initial = false }: { initial?: boolean }) {
  const [following, setFollowing] = useState(initial);
  return (
    <button
      type="button"
      aria-pressed={following}
      onClick={() => setFollowing((f) => !f)}
      className="inline-flex items-center gap-1 px-1.5 py-0 rounded-[4px] bg-accent-fill text-on-accent text-[11px] font-semibold leading-[17px] cursor-pointer transition-[filter] hover:brightness-110"
    >
      {following ? "Following" : "+ Follow"}
    </button>
  );
}
