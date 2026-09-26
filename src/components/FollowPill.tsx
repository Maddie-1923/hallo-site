"use client";

import { useState } from "react";

// Follow, in the theme's accent with its lettering: a pill reading
// "+ Follow" until you follow, then a circle holding a followed-person mark.
//
// In ordinary case rather than the tags' capitals. It stands alone on the
// right of the person's card, centred on their three lines, so it can be a
// comfortable size to press.
//
// Nothing is saved yet: follows arrive with the public tables and accounts
// (docs/social-plan.md, step 4). Until then the chip only changes what it
// shows, which is enough to see both states on the preview pages.
export function FollowPill({ initial = false }: { initial?: boolean }) {
  const [following, setFollowing] = useState(initial);
  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? "Following" : "Follow"}
      title={following ? "Following" : undefined}
      onClick={() => setFollowing((f) => !f)}
      // A filled pill while it offers "+ Follow"; once followed, no chip at
      // all, only the mark itself in the accent. Inside a filled circle the
      // mark's own disc read as a second, slightly off-centre ring.
      className={`inline-flex items-center justify-center rounded-full cursor-pointer transition-[filter] hover:brightness-110 ${
        following ? "w-10 h-10 text-accent-fill" : "h-9 px-4 bg-accent-fill text-on-accent text-[14px] font-semibold"
      }`}
    >
      {following ? <FollowingGlyph /> : "+ Follow"}
    </button>
  );
}

// Once followed, the button is only a mark: a filled disc with the person
// cut out of it and a check badge at the lower right, in the accent, drawn to
// match the app's `person.crop.circle.fill.badge.checkmark`. Drawn here
// rather than borrowed: SF Symbols are licensed for Apple platforms only, so
// the web gets its own. Lifted 3px: the disc starts that far into its box,
// and its top is meant to sit level with the handle's capitals.
function FollowingGlyph() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden className="block -translate-y-[3px]">
      <defs>
        {/* Everything is one colour; the person, the check and a hair of
            clearance round the badge are cut out of it, so whatever the
            button sits on shows through. */}
        <mask id="follow-glyph-cut">
          <rect width="24" height="24" fill="white" />
          <circle cx="18" cy="18" r="6.4" fill="black" />
        </mask>
        <mask id="follow-glyph-person">
          <circle cx="11" cy="11" r="9" fill="white" />
          <circle cx="11" cy="8.4" r="3.3" fill="black" />
          <ellipse cx="11" cy="18.6" rx="6.4" ry="4.8" fill="black" />
        </mask>
        <mask id="follow-glyph-check">
          <circle cx="18" cy="18" r="5" fill="white" />
          <path d="M15.6 18.1l1.6 1.6 3.1-3.3" fill="none" stroke="black" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
      </defs>
      <g mask="url(#follow-glyph-cut)">
        <circle cx="11" cy="11" r="9" fill="currentColor" mask="url(#follow-glyph-person)" />
      </g>
      <circle cx="18" cy="18" r="5" fill="currentColor" mask="url(#follow-glyph-check)" />
    </svg>
  );
}
