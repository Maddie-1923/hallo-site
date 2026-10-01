"use client";

import { useState } from "react";
import { usePrivacy } from "@/lib/privacy";
import { setFollow } from "@/lib/social-actions";

// Follow, in the theme's accent with its lettering: a pill reading
// "+ Follow" until you follow, then a circle holding a followed-person mark.
//
// In ordinary case rather than the tags' capitals. It stands alone on the
// right of the person's card, centred on their three lines, so it can be a
// comfortable size to press.
//
// On a real member's profile (`username` and `state` from the server) it
// follows or asks to (a private profile), shows "Requested" until they
// answer, and takes either back; a failure flips back and says why. On the
// preview it only changes what it shows.
// `owner`: on their own profile, seen as others do with follows turned off
// (Settings, Privacy), there's no Follow to press.
export function FollowPill({ initial = false, owner = false, username, state }: { initial?: boolean; owner?: boolean; username?: string; state?: "none" | "pending" | "following" | "self" }) {
  const [now, setNow] = useState<"none" | "pending" | "following">(state && state !== "self" ? state : initial ? "following" : "none");
  const [said, setSaid] = useState<string | null>(null);
  const privacy = usePrivacy(owner);
  const following = now === "following";
  if (privacy?.others && !privacy.allowFollows) return null;
  if (state === "self") return null;
  const press = async () => {
    const before = now;
    const on = now === "none";
    setNow(on ? "following" : "none");
    if (!username || state === undefined) return;
    const r = await setFollow(username, on).catch(() => ({ ok: false, error: "That didn't work. Try again." }) as { ok: boolean; error?: string; state?: undefined });
    if (!r.ok) {
      setNow(before);
      if (r.error) {
        setSaid(r.error);
        setTimeout(() => setSaid(null), 3000);
      }
    } else if (r.state && r.state !== "self") setNow(r.state);
  };
  if (now === "pending")
    return (
      <button type="button" onClick={press} title="Waiting for them to accept. Press to withdraw." className="inline-flex items-center justify-center rounded-full px-3 bg-card border border-hair text-dim text-[1.0833rem] font-semibold cursor-pointer" style={{ height: LINE, marginTop: `calc(${HANDLE} * -0.1)` }}>
        Requested
      </button>
    );
  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? "Following" : "Follow"}
      title={following ? "Following" : undefined}
      onClick={press}
      // A filled pill while it offers "+ Follow"; once followed, no chip at
      // all, only the mark itself in the accent. Inside a filled circle the
      // mark's own disc read as a second, slightly off-centre ring.
      className={`relative inline-flex items-center justify-center rounded-full cursor-pointer transition-[filter] hover:brightness-110 ${
        following ? "text-accent-fill" : "px-3 bg-accent-fill text-on-accent text-[1.0833rem] font-semibold"
      }`}
      // Both states stand as tall as the handle's line and are centred on its
      // capitals: the line is 0.9 of the handle's size and the capitals 0.7,
      // so the box starts 0.1 above the capitals' top, where this sits.
      style={{ height: LINE, marginTop: `calc(${HANDLE} * -0.1)` }}
    >
      {following ? <FollowingGlyph /> : "+ Follow"}
      {said && (
        <span role="alert" className="absolute right-0 top-[calc(100%+8px)] z-50 whitespace-nowrap rounded-full bg-card-hi border border-hair px-3 py-1 text-[1rem] text-ink shadow-lg">
          {said}
        </span>
      )}
    </button>
  );
}

// Once followed, the button is only a mark: a filled disc with the person
// cut out of it and a check badge, in the accent, drawn to
// match the app's `person.crop.circle.fill.badge.checkmark`: the disc high
// and right, the check badge large on its lower left. Drawn here
// rather than borrowed: SF Symbols are licensed for Apple platforms only, so
// the web gets its own.
// Sized to the handle beside it, whose size the card sets as
// clamp(20px, 1.8vw, 26px). The mark's disc (0.8 of its box) is as tall as
// the handle's whole line, 0.9 of that size, so it looks the same size as the
// name; the check badge hangs below and isn't counted.
export const HANDLE = "clamp(20px, 1.8vw, 26px)";
export const LINE = `calc(${HANDLE} * 0.9)`;
const SIZE = `calc(${HANDLE} * 1.125)`;

function FollowingGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="block shrink-0"
      // The disc is centred 2 units above the middle of the drawing (the
      // badge fills out the bottom), so the drawing is dropped by that much
      // to put the disc's own centre on the handle's.
      style={{ width: SIZE, height: SIZE, transform: `translateY(calc(${SIZE} / 12))` }}
    >
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
