"use client";

import { setViewAsOthers, useViewAsOthers } from "@/lib/privacy";

/** Over the owner's profile while they look at it as others do: says so,
    and the way back. */
export function ViewingAsOthers() {
  const on = useViewAsOthers();
  if (!on) return null;
  return (
    <div className="mb-3 rounded-shell bg-accent-fill text-on-accent px-3 py-2 flex items-center justify-between gap-3 text-[1.0417rem]">
      <span className="font-semibold">You&apos;re seeing your profile as others do, with your privacy settings.</span>
      <button type="button" onClick={() => setViewAsOthers(false)} className="shrink-0 rounded-full bg-black/15 px-3 py-1 font-semibold cursor-pointer hover:bg-black/25">
        Back to your view
      </button>
    </div>
  );
}
