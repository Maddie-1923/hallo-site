"use client";

import { useSyncExternalStore } from "react";

// Safety on the site: whom you've blocked and which followers you took off
// your list, kept in this browser so every page hides them at once, and
// mirrored to the account's `blocks` table
// (supabase/migrations/20260930000000_safety.sql). Reports go straight to
// the server (safety-actions.ts).

import { setBlockedOnAccount } from "./social-actions";
export { REPORT_REASONS, type Report, type ReportKind, type ReportReason } from "./safety-types";

interface Safety {
  blocked: string[];
  removedFollowers: string[];
}

const KEY = "kodigo.safety";
const EMPTY: Safety = { blocked: [], removedFollowers: [] };
let state: Safety = EMPTY;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) state = { ...EMPTY, ...JSON.parse(saved) };
  } catch {}
}

function save(next: Safety) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  subs.forEach((f) => f());
}

function subscribe(cb: () => void) {
  subs.add(cb);
  // Another tab blocking someone updates this one too.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subs.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function snapshot() {
  load();
  return state;
}

/** The whole store; EMPTY while the page is first drawn on the server. */
export function useSafety(): Safety {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function useBlocked(username: string | null | undefined): boolean {
  const s = useSafety();
  return !!username && s.blocked.includes(username);
}

export function block(username: string) {
  load();
  // Signed in, the account keeps it too (nothing happens before accounts).
  void setBlockedOnAccount(username, true).catch(() => {});
  if (state.blocked.includes(username)) return;
  // Blocking also ends any follow between you, both ways.
  save({ ...state, blocked: [...state.blocked, username], removedFollowers: [...new Set([...state.removedFollowers, username])] });
}

export function unblock(username: string) {
  load();
  void setBlockedOnAccount(username, false).catch(() => {});
  save({ ...state, blocked: state.blocked.filter((u) => u !== username) });
}

export function removeFollower(username: string) {
  load();
  if (!state.removedFollowers.includes(username)) save({ ...state, removedFollowers: [...state.removedFollowers, username] });
}
