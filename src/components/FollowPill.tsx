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
        {/* Everything is one colour; the person, the check and a gap round
            the badge are cut out of it, so whatever the button sits on shows
            through. Laid out like the symbol: the disc up and to the right,
            a large badge overlapping its lower-left edge. */}
        <mask id="follow-glyph-cut">
          <rect width="24" height="24" fill="white" />
          <circle cx="6.6" cy="17.4" r="7.1" fill="black" />
        </mask>
        <mask id="follow-glyph-person">
          <circle cx="13.6" cy="10.4" r="9.6" fill="white" />
          <circle cx="13.6" cy="8.2" r="3.9" fill="black" />
          <ellipse cx="13.6" cy="19.4" rx="7.2" ry="5.6" fill="black" />
        </mask>
        <mask id="follow-glyph-check">
          <circle cx="6.6" cy="17.4" r="5.6" fill="white" />
          <path d="M3.9 17.5l1.9 1.9 3.6-3.9" fill="none" stroke="black" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
      </defs>
      <g mask="url(#follow-glyph-cut)">
        <circle cx="13.6" cy="10.4" r="9.6" fill="currentColor" mask="url(#follow-glyph-person)" />
      </g>
      <circle cx="6.6" cy="17.4" r="5.6" fill="currentColor" mask="url(#follow-glyph-check)" />
    </svg>
  );
}
