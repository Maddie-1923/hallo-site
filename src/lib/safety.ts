"use client";

import { useSyncExternalStore } from "react";

// Safety on the site: blocking people, reporting what they post, and taking
// followers off your list. Until accounts open, all three are kept in this
// browser (so every part of it can be tried on the preview pages) and the
// server actions in safety-actions.ts do nothing; once they open, those
// actions write the `blocks` and `reports` tables
// (supabase/migrations/20260930000000_safety.sql) and this store mirrors them.

import type { Report } from "./safety-types";
export { REPORT_REASONS, type Report, type ReportKind, type ReportReason } from "./safety-types";

interface Safety {
  blocked: string[];
  removedFollowers: string[];
  reports: Report[];
}

const KEY = "kodigo.safety";
const EMPTY: Safety = { blocked: [], removedFollowers: [], reports: [] };
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
  if (state.blocked.includes(username)) return;
  // Blocking also ends any follow between you, both ways.
  save({ ...state, blocked: [...state.blocked, username], removedFollowers: [...new Set([...state.removedFollowers, username])] });
}

export function unblock(username: string) {
  load();
  save({ ...state, blocked: state.blocked.filter((u) => u !== username) });
}

export function removeFollower(username: string) {
  load();
  if (!state.removedFollowers.includes(username)) save({ ...state, removedFollowers: [...state.removedFollowers, username] });
}

export function addReport(r: Omit<Report, "id" | "at" | "status" | "reporter">) {
  load();
  const report: Report = { ...r, id: crypto.randomUUID(), at: new Date().toISOString(), status: "open", reporter: "preview" };
  save({ ...state, reports: [report, ...state.reports] });
  return report;
}

export function setReportStatus(ids: string[], status: Report["status"]) {
  load();
  save({ ...state, reports: state.reports.map((r) => (ids.includes(r.id) ? { ...r, status } : r)) });
}

/** The preview's made-up reports, added once so the moderation page has a
    queue to try (development only; see docs/social-plan.md, "Before
    opening"). */
export function seedReports(samples: Report[]) {
  load();
  const have = new Set(state.reports.map((r) => r.id));
  const fresh = samples.filter((r) => !have.has(r.id));
  if (fresh.length) save({ ...state, reports: [...state.reports, ...fresh] });
}
