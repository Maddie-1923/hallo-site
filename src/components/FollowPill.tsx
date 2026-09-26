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
// cut out of it and a check badge, in the accent, drawn to
// match the app's `person.crop.circle.fill.badge.checkmark`: the disc high
// and right, the check badge large on its lower left. Drawn here
// rather than borrowed: SF Symbols are licensed for Apple platforms only, so
// the web gets its own. Lifted a pixel so the disc's top sits level with the
// handle's capitals.
function FollowingGlyph() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden className="block -translate-y-px">
      <defs>
        {/* Everything is one colour; the person, the check and a thin gap
            round the badge are cut out of it, so whatever the button sits on
            shows through. Laid out like the symbol: the disc up and to the
            right, a large badge on its lower left.

            The torso is cut to a circle a little inside the disc's own, so
            an even band of the disc runs round under it, the way the symbol
            draws it: the shoulders stop short of the edge rather than
            running out through it. */}
        <clipPath id="follow-glyph-inner">
          <circle cx="14" cy="10" r="8.5" />
        </clipPath>
        <mask id="follow-glyph-person">
          <circle cx="14" cy="10" r="9.6" fill="white" />
          <circle cx="14" cy="7.4" r="3.6" fill="black" />
          <ellipse cx="14" cy="19.6" rx="7.6" ry="7.4" fill="black" clipPath="url(#follow-glyph-inner)" />
          {/* The gap round the badge. */}
          <circle cx="7.6" cy="16.4" r="6.6" fill="black" />
        </mask>
        <mask id="follow-glyph-badge">
          <circle cx="7.6" cy="16.4" r="5.8" fill="white" />
          <path d="M4.9 16.5l1.9 1.9 3.6-3.9" fill="none" stroke="black" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
      </defs>
      <circle cx="14" cy="10" r="9.6" fill="currentColor" mask="url(#follow-glyph-person)" />
      <rect width="24" height="24" fill="currentColor" mask="url(#follow-glyph-badge)" />
    </svg>
  );
}
