"use client";

import { useEffect, useSyncExternalStore } from "react";
import { loadAccountSettings, saveAccountSettings, type AccountSettings } from "./account-settings";
import { APPEARANCE_KEY, THEME_KEY, applyTheme } from "./theme";

// A person's settings, read by whatever needs them: this browser's copy,
// and the account's once they're signed in.
import { DEFAULTS, type Settings } from "./settings-shape";
export { DEFAULTS, type Settings } from "./settings-shape";

const KEY = "kodigo.settings";
/** The country chosen in Settings, also as a cookie so the server, which
    decides where to watch and the local rows, uses it (see lib/region). */
export const REGION_COOKIE = "kodigo-region";

// One copy for the whole page, so a change in Settings reaches everything
// that reads it at once. It starts from this browser's copy; the first page
// that asks also asks the account (lib/account-settings.ts), whose copy wins
// when someone's signed in, and every change is saved back to it a moment
// later. Signed out, the browser's copy is all there is.
let state: Settings = DEFAULTS;
let loaded = false;
let asked = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

/** What the account holds beyond the settings, for the pages that edit it. */
let account: Omit<AccountSettings, "settings"> | null = null;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) state = { ...DEFAULTS, ...JSON.parse(saved) };
  } catch {}
}

function keep(next: Settings, regionChanged: boolean) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    if (regionChanged) document.cookie = next.region ? `${REGION_COOKIE}=${next.region}; path=/; max-age=31536000; samesite=lax` : `${REGION_COOKIE}=; path=/; max-age=0`;
  } catch {}
  notify();
}

async function askAccount() {
  if (asked) return;
  asked = true;
  const got = await loadAccountSettings().catch(() => null);
  if (!got) return;
  load();
  const { settings, ...rest } = got;
  account = rest;
  keep({ ...state, ...settings }, "region" in settings && settings.region !== state.region);
  // The account learns this browser's time zone, for when emails come.
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && zone !== state.timeZone) {
      keep({ ...state, timeZone: zone }, false);
      saveSoon({ timeZone: zone });
    }
  } catch {}
  // Their theme follows them too; day or night stays with the device.
  if (got.theme) {
    try {
      if (localStorage.getItem(THEME_KEY) !== got.theme) {
        localStorage.setItem(THEME_KEY, got.theme);
        const ap = localStorage.getItem(APPEARANCE_KEY);
        applyTheme(got.theme, ap === "light" || ap === "dark" ? ap : "system");
      }
    } catch {}
  }
}

let pending: Partial<Settings> = {};
let timer: ReturnType<typeof setTimeout> | null = null;
function saveSoon(patch: Partial<Settings>) {
  pending = { ...pending, ...patch };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const p = pending;
    pending = {};
    void saveAccountSettings(p).catch(() => {});
  }, 600);
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const s = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => {
      load();
      return state;
    },
    () => DEFAULTS,
  );
  useEffect(() => {
    void askAccount();
  }, []);
  const update = (patch: Partial<Settings>) => {
    load();
    keep({ ...state, ...patch }, "region" in patch);
    saveSoon(patch);
  };
  return [s, update];
}

/** The account's location, quote and category eyes, once known; null
    signed out. Re-renders when they arrive. */
export function useAccountExtras() {
  useSettings();
  return account;
}
