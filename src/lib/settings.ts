"use client";

import { useEffect, useState } from "react";

// A person's settings. Until accounts exist they are kept in this browser
// (one key), and read by whatever needs them; with accounts they move to the
// profile and the library.
export interface Settings {
  displayName: string;
  // Privacy.
  publicProfile: boolean;
  showActivity: boolean;
  showWatchlog: boolean;
  allowFollows: boolean;
  // Notifications, by email.
  notifyFollows: boolean;
  notifyLikes: boolean;
  notifyComments: boolean;
  weeklyDigest: boolean;
  // Where they watch.
  region: string | null;
  services: number[];
  onlyMyServices: boolean;
  // How things read.
  dateFormat: "day-month" | "month-day" | "numeric";
  // Spoilers, until an episode is watched.
  hideTitles: boolean;
  hideDescriptions: boolean;
  hideImages: boolean;
}

export const DEFAULTS: Settings = {
  displayName: "",
  publicProfile: true,
  showActivity: true,
  showWatchlog: true,
  allowFollows: true,
  notifyFollows: true,
  notifyLikes: true,
  notifyComments: true,
  weeklyDigest: false,
  region: null,
  services: [],
  onlyMyServices: false,
  dateFormat: "day-month",
  hideTitles: false,
  hideDescriptions: false,
  hideImages: false,
};

const KEY = "kodigo.settings";
/** The country chosen in Settings, also as a cookie so the server, which
    decides where to watch and the local rows, uses it (see lib/region). */
export const REGION_COOKIE = "kodigo-region";

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [s, setS] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setS({ ...DEFAULTS, ...JSON.parse(saved) });
    } catch {}
  }, []);
  const update = (patch: Partial<Settings>) =>
    setS((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        if ("region" in patch) document.cookie = next.region ? `${REGION_COOKIE}=${next.region}; path=/; max-age=31536000; samesite=lax` : `${REGION_COOKIE}=; path=/; max-age=0`;
      } catch {}
      return next;
    });
  return [s, update];
}
