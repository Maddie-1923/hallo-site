"use client";

import { useState } from "react";

// Follow, in the theme's accent with its lettering: a pill reading
// "+ Follow" until you follow, then a circle holding a followed-person mark.
//
// In ordinary case rather than the tags' capitals: capitals read a size too
// big beside the followers line at every size down to 8px, and 11px
// lowercase stands at about the height those 8px capitals did.
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
      // A pill while it offers "+ Follow"; once followed it closes up into a
      // circle the same height, so the mark inside sits centred and round in
      // round rather than lost in a lozenge.
      className={`inline-flex items-center justify-center h-6 rounded-full bg-accent-fill text-on-accent cursor-pointer transition-[filter] hover:brightness-110 ${
        following ? "w-6" : "px-2.5 text-[11px] font-semibold"
      }`}
    >
      {following ? <FollowingGlyph /> : "+ Follow"}
    </button>
  );
}

// Once followed, the chip shows a mark instead of a word: a person in a
// circle with a check badge at the lower right, drawn to match the app's
// `person.crop.circle.badge.checkmark`. Drawn here rather than borrowed:
// SF Symbols are licensed for Apple platforms only, so the web gets its own.
function FollowingGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="block">
      <defs>
        {/* The person is cut to the circle, and the circle is cut away where
            the badge sits, with a hair of clearance around it. */}
        <clipPath id="follow-glyph-circle">
          <circle cx="11" cy="11" r="8.4" />
        </clipPath>
        <mask id="follow-glyph-cut">
          <rect width="24" height="24" fill="white" />
          <circle cx="18" cy="18" r="6.4" fill="black" />
        </mask>
      </defs>
      <g mask="url(#follow-glyph-cut)">
        <circle cx="11" cy="11" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <g clipPath="url(#follow-glyph-circle)" fill="currentColor">
          <circle cx="11" cy="8.6" r="3.2" />
          <ellipse cx="11" cy="18.4" rx="6.2" ry="4.6" />
        </g>
      </g>
      <circle cx="18" cy="18" r="5" fill="currentColor" />
      <path d="M15.6 18.1l1.6 1.6 3.1-3.3" fill="none" stroke="var(--accent-fill)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
