"use client";

import { useState } from "react";

// Follow, drawn the way the app draws its status tags (New, Premiere): a
// small filled chip with a 6px corner and bold capitals spaced a little
// apart, in the theme's accent with its lettering. 8px capitals: the user
// took it down a step at a time from the followers line's 12.5px, through
// 10px and the app's own 9px, and each still read too big beside it. "+ Follow" until you
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
      className="inline-flex items-center gap-1 px-1 py-0 rounded-[4px] bg-accent-fill text-on-accent text-[8px] font-bold uppercase tracking-[.08em] leading-[12px] cursor-pointer transition-[filter] hover:brightness-110"
    >
      {following ? "Following" : "+ Follow"}
    </button>
  );
}
