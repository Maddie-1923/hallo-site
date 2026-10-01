"use server";

import { accountsOpen } from "@/lib/accounts";
import { cleanSettings, PROFILE_SETTINGS, type Settings } from "@/lib/settings-shape";
import { createClient } from "@/lib/supabase/server";
import { THEMES } from "@/lib/theme";
import { checkName, checkText } from "@/lib/word-filter";

// The account's copy of someone's settings (docs/social-plan.md, step 1.3).
// The ones that decide what visitors see are columns on their profile; the
// rest are in user_settings, theirs alone
// (supabase/migrations/20260930050000_settings_sync.sql). Signed out, or
// before accounts open, every action here does nothing and the browser's
// copy is all there is.

export interface AccountSettings {
  settings: Partial<Settings>;
  theme: string | null;
  about: { location: string; quote: string };
  categoryPrivacy: Record<string, boolean>;
}

async function signedIn() {
  if (!accountsOpen) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

/** Everything the account holds, for the browser to take on at sign-in. */
export async function loadAccountSettings(): Promise<AccountSettings | null> {
  const me = await signedIn();
  if (!me) return null;
  const [{ data: p }, { data: u }] = await Promise.all([
    me.supabase.from("profiles").select("display_name, is_private, show_activity, show_watchlog, show_watchlist, show_watching, allow_follows, location, quote, category_privacy").eq("user_id", me.user.id).maybeSingle(),
    me.supabase.from("user_settings").select("settings").eq("user_id", me.user.id).maybeSingle(),
  ]);
  const own = (u?.settings ?? {}) as Record<string, unknown>;
  const settings: Partial<Settings> = { ...cleanSettings(own) };
  if (p) {
    settings.displayName = p.display_name ?? "";
    settings.publicProfile = !p.is_private;
    settings.showActivity = p.show_activity;
    settings.showWatchlog = p.show_watchlog;
    settings.showWatchlist = p.show_watchlist;
    settings.showWatching = p.show_watching;
    settings.allowFollows = p.allow_follows;
  }
  return {
    settings,
    theme: typeof own.theme === "string" ? own.theme : null,
    about: { location: p?.location ?? "", quote: p?.quote ?? "" },
    categoryPrivacy: (p?.category_privacy as Record<string, boolean>) ?? {},
  };
}

/** Saves changed settings: the visitor-facing ones to the profile, the rest to user_settings. */
export async function saveAccountSettings(patch: Partial<Settings>): Promise<{ ok: boolean; error?: string }> {
  const me = await signedIn();
  if (!me) return { ok: false };
  const clean = cleanSettings(patch as Record<string, unknown>);
  const profile: Record<string, unknown> = {};
  const own: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(clean)) {
    const col = PROFILE_SETTINGS[k as keyof typeof PROFILE_SETTINGS];
    if (!col) own[k] = v;
    else if (k === "publicProfile") profile[col] = !v;
    else if (k === "displayName") {
      const name = String(v).trim().slice(0, 40);
      const problem = name ? checkName(name) : null;
      if (problem) return { ok: false, error: problem };
      profile[col] = name || null;
    } else profile[col] = v;
  }
  if (Object.keys(profile).length) {
    const { error } = await me.supabase.from("profiles").upsert({ user_id: me.user.id, ...profile }, { onConflict: "user_id" });
    if (error) return { ok: false, error: "That didn't save to your account." };
  }
  if (Object.keys(own).length && !(await mergeOwn(me, own))) return { ok: false, error: "That didn't save to your account." };
  return { ok: true };
}

/** The theme, kept with the account so it follows them. */
export async function saveAccountTheme(id: string): Promise<boolean> {
  if (!THEMES.some((t) => t.id === id)) return false;
  const me = await signedIn();
  return !!me && (await mergeOwn(me, { theme: id }));
}

/** Location and quote, shown on the profile. */
export async function saveAbout(about: { location: string; quote: string }): Promise<{ ok: boolean; error?: string }> {
  const location = about.location.trim().slice(0, 60);
  const quote = about.quote.trim().slice(0, 140);
  const problem = checkText(`${location}\n${quote}`);
  if (problem) return { ok: false, error: problem };
  const me = await signedIn();
  if (!me) return { ok: false };
  const { error } = await me.supabase.from("profiles").upsert({ user_id: me.user.id, location: location || null, quote: quote || null }, { onConflict: "user_id" });
  return error ? { ok: false, error: "That didn't save to your account." } : { ok: true };
}

/** Each category's eye: { "list:ID": true } for hidden. */
export async function saveCategoryPrivacy(privacy: Record<string, boolean>): Promise<boolean> {
  const me = await signedIn();
  if (!me) return false;
  const clean = Object.fromEntries(
    Object.entries(privacy)
      .filter(([k, v]) => typeof v === "boolean" && /^[a-zA-Z0-9:_-]{1,80}$/.test(k))
      .slice(0, 300),
  );
  const { error } = await me.supabase.from("profiles").upsert({ user_id: me.user.id, category_privacy: clean }, { onConflict: "user_id" });
  return !error;
}

async function mergeOwn(me: NonNullable<Awaited<ReturnType<typeof signedIn>>>, patch: Record<string, unknown>) {
  const { data } = await me.supabase.from("user_settings").select("settings").eq("user_id", me.user.id).maybeSingle();
  const { error } = await me.supabase.from("user_settings").upsert({ user_id: me.user.id, settings: { ...((data?.settings as object) ?? {}), ...patch } }, { onConflict: "user_id" });
  return !error;
}

// ---- The order of Explore's rows ----
//
// Each tab (All, Shows, Movies) keeps its own order: a list of row keys,
// "b:<slug>" for a built-in row and "c:<ID>" for a custom category. Kept in
// user_settings beside the theme. Rows not named (new ones) keep their
// natural place after the named ones.
export type ExploreTab = "all" | "show" | "movie";
const TABS: ExploreTab[] = ["all", "show", "movie"];
const cleanKeys = (keys: unknown) =>
  Array.isArray(keys) ? [...new Set(keys.filter((k): k is string => typeof k === "string" && /^[bc]:[A-Za-z0-9-]{1,60}$/.test(k)))].slice(0, 60) : [];

export async function loadExploreOrder(tab: ExploreTab): Promise<string[]> {
  const me = await signedIn();
  if (!me) return [];
  const { data } = await me.supabase.from("user_settings").select("settings").eq("user_id", me.user.id).maybeSingle();
  const all = (data?.settings as Record<string, unknown> | undefined)?.exploreOrder as Record<string, unknown> | undefined;
  return cleanKeys(all?.[tab]);
}

export async function saveExploreOrder(tab: ExploreTab, keys: string[]): Promise<boolean> {
  if (!TABS.includes(tab)) return false;
  const me = await signedIn();
  if (!me) return false;
  const { data } = await me.supabase.from("user_settings").select("settings").eq("user_id", me.user.id).maybeSingle();
  const had = ((data?.settings as Record<string, unknown> | undefined)?.exploreOrder ?? {}) as Record<string, unknown>;
  return mergeOwn(me, { exploreOrder: { ...had, [tab]: cleanKeys(keys) } });
}
