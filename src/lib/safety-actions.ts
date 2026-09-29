"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { accountsOpen } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS, type Report, type ReportKind, type ReportReason } from "@/lib/safety-types";

// The server's half of safety (lib/safety.ts has the browser's). Until
// accounts open each action answers { saved: false } and the browser keeps
// the block or report itself; afterwards they write the `blocks` and
// `reports` tables (supabase/migrations/20260930000000_safety.sql).

const KINDS: ReportKind[] = ["review", "comment", "list", "profile"];
const REASONS = REPORT_REASONS.map(([id]) => id) as readonly string[];

export async function fileReport(input: { kind: ReportKind; target: string; author: string; href: string; excerpt: string; reason: ReportReason; note: string }): Promise<{ saved: boolean; error?: string }> {
  if (!KINDS.includes(input.kind) || !REASONS.includes(input.reason)) return { saved: false, error: "Choose what's wrong." };
  if (!accountsOpen) return { saved: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { saved: false, error: "Sign in to report." };
  // A brake on floods: 20 reports an hour is far past what anyone needs.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase.from("reports").select("id", { count: "exact", head: true }).eq("reporter", user.id).gte("created_at", since);
  if ((count ?? 0) >= 20) return { saved: false, error: "That's a lot of reports in an hour. Try again later, or email hello@kodigo.pro." };
  const { error } = await supabase.from("reports").insert({
    reporter: user.id,
    kind: input.kind,
    target: input.target.slice(0, 200),
    author_username: input.author.slice(0, 40),
    href: input.href.slice(0, 300),
    excerpt: input.excerpt.slice(0, 600),
    reason: input.reason,
    note: input.note.slice(0, 500),
  });
  // Reporting the same thing twice isn't an error to the person.
  if (error && error.code !== "23505") return { saved: false, error: "That didn't send. Try again." };
  return { saved: true };
}

/** Whether the signed-in person runs moderation: their email is in
    MODERATOR_EMAILS (comma-separated). In development the preview's queue
    is open to whoever runs the site locally. */
export async function moderatorAccess(): Promise<"live" | "preview" | null> {
  if (accountsOpen) {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    const allowed = (process.env.MODERATOR_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (user?.email && allowed.includes(user.email.toLowerCase())) return "live";
  }
  return process.env.NODE_ENV === "development" ? "preview" : null;
}

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** The live queue, newest first, for the moderation page. */
export async function loadReports(): Promise<Report[] | null> {
  if ((await moderatorAccess()) !== "live") return null;
  const db = admin();
  if (!db) return null;
  const { data } = await db.from("reports").select("*").order("created_at", { ascending: false }).limit(500);
  return (data ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    target: r.target,
    author: r.author_username,
    href: r.href,
    excerpt: r.excerpt,
    reason: r.reason,
    note: r.note,
    reporter: r.reporter ?? "deleted account",
    at: r.created_at,
    status: r.status,
  }));
}

/** Settles reports: dismissed, content removed, or the author suspended.
    Removing content and suspending act on the public tables once they
    exist (step 1); until then the decision is recorded on the reports. */
export async function resolveReports(ids: string[], status: Report["status"]): Promise<boolean> {
  if ((await moderatorAccess()) !== "live") return false;
  const db = admin();
  if (!db) return false;
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const { error } = await db.from("reports").update({ status, resolved_at: status === "open" ? null : new Date().toISOString(), resolved_by: status === "open" ? null : user?.id }).in("id", ids);
  return !error;
}
