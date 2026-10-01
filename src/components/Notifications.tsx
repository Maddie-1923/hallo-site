"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Notification, NotificationKind } from "@/lib/notifications";
import { useSettings, type Settings } from "@/lib/settings";
import { useSafety } from "@/lib/safety";
import { useDateFormat } from "./Day";
import { Menu } from "./Menu";
import { markNotificationsRead } from "@/lib/social-actions";

// Notifications: the bell in the bar, with the count of new ones, opening the
// latest few; and the page with all of them by day. Only the kinds switched
// on in Settings (Notifications) show. Opening the bell marks them read.
const READ_KEY = "kodigo.notifications-read";
const SETTING: Record<NotificationKind, keyof Settings> = { follow: "notifyFollows", follow_request: "notifyFollows", follow_accepted: "notifyFollows", like: "notifyLikes", comment: "notifyComments" };

// When they last looked, shared by the bell and the page.
const subs = new Set<() => void>();
function readAt() {
  try {
    return localStorage.getItem(READ_KEY) ?? "";
  } catch {
    return "";
  }
}
function markRead() {
  try {
    localStorage.setItem(READ_KEY, new Date().toISOString());
  } catch {}
  // Signed in, the account's are marked read too (nothing happens otherwise).
  void markNotificationsRead().catch(() => {});
  subs.forEach((f) => f());
}
function useReadAt() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    readAt,
    () => "9999",
  );
}

/** The kinds switched on in Settings, and nothing from anyone blocked. */
function useShown(all: Notification[]) {
  const [s] = useSettings();
  const { blocked } = useSafety();
  // A request to follow always shows: it's waiting on an answer.
  return all.filter((n) => (n.kind === "follow_request" || s[SETTING[n.kind]]) && !blocked.includes(n.who));
}

export function NotificationsBell({ items, framed = false }: { items: Notification[]; framed?: boolean }) {
  const shown = useShown(items);
  const read = useReadAt();
  const isNew = (n: Notification) => (n.read === undefined ? n.at > read : !n.read && n.at > read);
  const fresh = shown.filter(isNew).length;
  const shell = framed ? "bg-black/35 border-white/25 backdrop-blur-md text-white" : "bg-card border-hair text-ink";
  return (
    <Menu
      label="Notifications"
      width={340}
      button={
        <span className={`relative w-9 h-9 rounded-full border flex items-center justify-center ${shell}`} onClick={() => setTimeout(markRead, 400)}>
          <BellGlyph />
          {fresh > 0 && <span className="absolute -top-1 -right-1 min-w-[1.5rem] h-[1.5rem] px-1 rounded-full bg-accent-fill text-on-accent text-[0.875rem] font-bold leading-[1.5rem] text-center">{fresh}</span>}
        </span>
      }
    >
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <span className="text-[0.875rem] font-bold tracking-[.12em] uppercase text-dim">Notifications</span>
        <Link href="/settings#notifications" data-menu-close className="text-[1.0417rem] text-dim no-underline hover:text-ink">
          Settings
        </Link>
      </div>
      {shown.length === 0 ? (
        <p className="m-0 px-4 pb-4 text-[1.0417rem] text-dim">Nothing yet.</p>
      ) : (
        <ul className="m-0 p-0 pb-1 list-none">
          {shown.slice(0, 6).map((n) => (
            <li key={n.id}>
              <Item n={n} fresh={isNew(n)} compact />
            </li>
          ))}
        </ul>
      )}
      <Link href="/notifications" data-menu-close className="block border-t border-hair px-4 py-2.5 text-[1.0417rem] font-semibold text-accent no-underline hover:bg-card-hi">
        See all notifications
      </Link>
    </Menu>
  );
}

export function NotificationsPage({ items }: { items: Notification[] }) {
  const [s] = useSettings();
  const shown = useShown(items);
  const read = useReadAt();
  const [kind, setKind] = useState<NotificationKind | "all">("all");
  // Arriving here counts as seeing them.
  useEffect(() => {
    const t = setTimeout(markRead, 1500);
    return () => clearTimeout(t);
  }, []);
  const list = kind === "all" ? shown : shown.filter((n) => n.kind === kind);
  const off = (["follow", "like", "comment"] as NotificationKind[]).filter((k) => !s[SETTING[k]]);
  const groups = byDay(list);
  const tabs: [NotificationKind | "all", string][] = [
    ["all", "All"],
    ["follow", "Follows"],
    ["like", "Likes"],
    ["comment", "Replies"],
  ];
  return (
    <div className="max-w-[60rem] grid grid-cols-[minmax(0,1fr)] gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Kinds" className="inline-flex gap-1 p-1 rounded-full bg-card border border-hair">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={`px-4 py-2 rounded-full text-[0.875rem] leading-none font-bold uppercase tracking-[.12em] cursor-pointer transition-colors ${kind === k ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Link href="/settings#notifications" className="text-[1.0417rem] text-dim no-underline hover:text-ink">
          Notification settings
        </Link>
      </div>

      {off.length > 0 && (
        <p className="m-0 rounded-shell bg-card p-3 text-[1.0417rem] text-dim">
          {listOf(off.map((k) => ({ follow: "Follows", follow_request: "Follows", follow_accepted: "Follows", like: "Likes", comment: "Replies" })[k]))} are switched off in{" "}
          <Link href="/settings#notifications" className="text-accent no-underline hover:underline">
            Settings
          </Link>
          .
        </p>
      )}

      {groups.length === 0 && <p className="m-0 rounded-shell bg-card p-3 text-[1.0417rem] text-dim">Nothing here yet.</p>}

      {groups.map(([label, ns]) => (
        <section key={label} className="grid grid-cols-[minmax(0,1fr)] gap-2">
          <div>
            <h2 className="inline-flex items-center h-[2.8333rem] px-4 rounded-full bg-piece ![font-family:var(--font-body)] !font-bold !text-[0.875rem] !leading-none !tracking-[.12em] uppercase text-ink">{label}</h2>
          </div>
          <div className="rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]">
            <ul className="m-0 p-0 list-none rounded-shell bg-piece divide-y divide-hair overflow-hidden">
              {ns.map((n) => (
                <li key={n.id}>
                  <Item n={n} fresh={n.read === undefined ? n.at > read : !n.read && n.at > read} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}

/** One notification: who, what, when, and the review's poster. */
function Item({ n, fresh, compact = false }: { n: Notification; fresh: boolean; compact?: boolean }) {
  const fmt = useDateFormat();
  const href = n.href ?? (n.kind === "follow" ? `/u/${n.who}` : n.about?.href ?? "#");
  const thing = n.target === "list" ? "list" : "review of";
  const what =
    n.kind === "follow"
      ? "started following you"
      : n.kind === "follow_request"
        ? "asked to follow you. Answer in your Followers"
        : n.kind === "follow_accepted"
          ? "accepted your follow request"
          : n.kind === "like"
            ? `liked your ${thing}`
            : `commented on your ${thing}`;
  return (
    <Link href={href} data-menu-close className={`flex items-start gap-3 ${compact ? "px-4 py-2.5 hover:bg-card-hi" : "p-3 hover:bg-card"} no-underline text-ink transition-colors`}>
      <span className="relative shrink-0 w-9 h-9 rounded-full bg-accent-fill text-on-accent flex items-center justify-center display text-[1.4167rem] leading-none pt-[2px]">
        {n.who[0].toUpperCase()}
        <span className="absolute -right-1 -bottom-1 w-[1.5rem] h-[1.5rem] rounded-full bg-card border border-hair flex items-center justify-center text-ink">
          <KindGlyph kind={n.kind} />
        </span>
      </span>
      <span className="min-w-0 flex-1 text-[1.0417rem] leading-[1.45]">
        <span className="font-semibold">@{n.who}</span> <span className="text-mid-tone">{what}</span>
        {n.about && <span className="font-semibold"> {n.about.title}</span>}
        {n.text && <span className={`block mt-0.5 text-dim ${compact ? "truncate" : ""}`}>&ldquo;{n.text}&rdquo;</span>}
        <span className="block mt-0.5 text-dim">
          {ago(n.at, fmt)}
          {fresh && <span aria-label="New" className="inline-block ml-2 w-1.5 h-1.5 rounded-full bg-accent-fill align-middle" />}
        </span>
      </span>
      {n.about?.poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={n.about.poster} alt="" className="shrink-0 w-9 aspect-[2/3] object-cover rounded-[6px] border border-hair" />
      )}
    </Link>
  );
}

/** "Just now", "3h ago", "Yesterday", then the date in their format. */
function ago(at: string, fmt: ReturnType<typeof useDateFormat>) {
  const mins = (Date.now() - Date.parse(at)) / 60_000;
  if (mins < 1) return "Just now";
  if (mins < 60) return `${Math.round(mins)}m ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h ago`;
  if (mins < 48 * 60) return "Yesterday";
  return fmt(at, "short");
}

/** Today, Yesterday, This week, Earlier. */
function byDay(list: Notification[]): [string, Notification[]][] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const t0 = start.getTime();
  const label = (n: Notification) => {
    const t = Date.parse(n.at);
    if (t >= t0) return "Today";
    if (t >= t0 - 86_400_000) return "Yesterday";
    if (t >= t0 - 6 * 86_400_000) return "This week";
    return "Earlier";
  };
  const out: [string, Notification[]][] = [];
  for (const n of list) {
    const l = label(n);
    const g = out.find(([x]) => x === l);
    if (g) g[1].push(n);
    else out.push([l, [n]]);
  }
  return out;
}

function listOf(words: string[]) {
  return words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

function BellGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function KindGlyph({ kind }: { kind: NotificationKind }) {
  if (kind === "like")
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.2 3 4.5 6.7 4.5c2.2 0 3.6 1.2 4.3 2.4.7-1.2 2.1-2.4 4.3-2.4 3.7 0 5.9 3.7 4.3 7.3C19.5 16.4 12 21 12 21z" />
      </svg>
    );
  if (kind === "comment")
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 5h16v11H9l-5 4z" />
      </svg>
    );
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
