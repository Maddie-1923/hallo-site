"use client";

import type { DiaryEntry, ProfileTitle } from "./public-profile";

// What someone saved in Your take on a title's page, kept in this browser
// until accounts exist, so their Watchlog can show it (with its review, read
// from the Review column) on the next visit to their profile. Once accounts
// exist, Save writes to the library and the log is drawn from that instead.
export interface LocalTake {
  t: ProfileTitle;
  /** The day it was watched, or the day it was saved. */
  date: string;
  rating: number | null;
  text: string;
  spoilers: boolean;
  rewatch: boolean;
  moods: string[];
  tags: string[];
  note: string;
}

const KEY = "kodigo.takes";

export function readTakes(): Record<string, LocalTake> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveTake(take: LocalTake) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readTakes(), [take.t.key]: take }));
  } catch {}
}

/** The takes as Watchlog entries: one a title, on the day it was watched. */
export function takesAsEntries(): DiaryEntry[] {
  return Object.values(readTakes()).map((k) => ({
    ...k.t,
    date: k.date,
    rating: k.rating,
    loved: k.moods.includes("Loved it"),
    rewatch: k.rewatch,
    reviewed: !!k.text.trim(),
    review: k.text.trim() ? { text: k.text.trim(), spoilers: k.spoilers } : undefined,
  }));
}
