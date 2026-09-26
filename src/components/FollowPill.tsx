"use client";

import { useState } from "react";

// Follow, drawn the way the app draws its status tags (New, Premiere): a
// small filled chip with a 6px corner and bold capitals spaced a little
// apart, in the theme's accent with its lettering. "+ Follow" until you
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
      className="inline-flex items-center gap-1 px-2 py-[3px] rounded-[6px] bg-accent-fill text-on-accent text-[11px] font-bold uppercase tracking-[.04em] leading-[16px] cursor-pointer transition-[filter] hover:brightness-110"
    >
      {following ? "Following" : "+ Follow"}
    </button>
  );
}
