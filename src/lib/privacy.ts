"use client";

import { useSyncExternalStore } from "react";
import { useSettings } from "./settings";

// Privacy (Settings, Privacy) on the person's own profile. What they choose
// changes what other people see; so they can check it, the profile's ⋯ menu
// offers "See your profile as others do", which lasts until they leave the
// page or turn it off. Someone else's profile keeps its owner's choices,
// which arrive with accounts.
let asOthers = false;
const subs = new Set<() => void>();

export function setViewAsOthers(v: boolean) {
  asOthers = v;
  subs.forEach((f) => f());
}

export function useViewAsOthers() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => asOthers,
    () => false,
  );
}

/** For the owner's own profile: their privacy choices, and whether the page
    is being shown as other people see it. Null on anyone else's. */
export function usePrivacy(owner: boolean) {
  const [s] = useSettings();
  const others = useViewAsOthers();
  if (!owner) return null;
  return { others, publicProfile: s.publicProfile, showActivity: s.showActivity, showWatchlog: s.showWatchlog, allowFollows: s.allowFollows };
}
