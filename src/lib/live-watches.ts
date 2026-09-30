"use client";

import { useSyncExternalStore } from "react";
import type { ProfileTitle } from "./public-profile";

// Watches marked on this page, newest first, so everything on the page that
// lists what someone watched (Recent activity) shows them the moment the
// tracker's check lands, without a reload.
//
// Only the page's memory holds them for now. Once accounts exist the check
// writes to the library the way the web's library actions already do (the
// episode's watched date, its stamp), and that one write is what puts the
// watch in Recent activity here and in Recents in the apps; this store then
// only bridges the moment before the page is next drawn from it.
export interface LiveWatch {
  key: string;
  /** "YYYY-MM-DD", the day it was marked. */
  date: string;
  t: ProfileTitle;
  /** "S1 E17" for an episode; absent for a film. */
  detail?: string;
}

let watches: LiveWatch[] = [];
const listeners = new Set<() => void>();

export function addWatch(w: LiveWatch) {
  watches = [w, ...watches];
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const none: LiveWatch[] = [];
export function useLiveWatches() {
  return useSyncExternalStore(subscribe, () => watches, () => none);
}

/** Today in the visitor's own time zone, as "YYYY-MM-DD". */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
