import "server-only";
import { loadProfile } from "./profile-previews";

// Notifications: someone followed you, liked your review or list, or
// replied to it. They arrive with accounts and the social tables
// (docs/social-plan.md, step 4); until then the development preview is given
// a made-up handful about its own reviews, so the bell and the page can be
// built and tried. Which kinds show follows Settings, Notifications.
export type NotificationKind = "follow" | "like" | "comment";

export interface Notification {
  id: string;
  kind: NotificationKind;
  who: string;
  /** When, as an ISO time. */
  at: string;
  /** The review it's about, for a like or a reply. */
  about?: { title: string; poster: string | null; href: string };
  /** A reply's opening words. */
  text?: string;
}

const PEOPLE = ["moviemarta", "joelwatches", "night.owl.nadia", "cinemasam", "reeltalk.rosa"];

let cached: { at: number; list: Notification[] } | null = null;

/** The preview's notifications, newest first. Development only. */
export async function sampleNotifications(): Promise<Notification[]> {
  if (process.env.NODE_ENV !== "development") return [];
  if (cached && Date.now() - cached.at < 60_000) return cached.list;
  const v = await loadProfile("preview");
  const reviews = v?.reviews ?? [];
  const about = (i: number) => {
    const r = reviews[i % Math.max(1, reviews.length)];
    return r ? { title: r.title, poster: r.poster, href: `/u/preview/review/${r.key}` } : undefined;
  };
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const list: Notification[] = [
    { id: "n1", kind: "like", who: PEOPLE[0], at: hoursAgo(0.3), about: about(0) },
    { id: "n2", kind: "comment", who: PEOPLE[1], at: hoursAgo(2), about: about(0), text: "Completely agree about the middle stretch. I nearly gave up and I'm so glad I didn't." },
    { id: "n3", kind: "follow", who: PEOPLE[3], at: hoursAgo(5) },
    { id: "n4", kind: "like", who: PEOPLE[2], at: hoursAgo(20), about: about(1) },
    { id: "n5", kind: "like", who: PEOPLE[4], at: hoursAgo(30), about: about(0) },
    { id: "n6", kind: "comment", who: PEOPLE[2], at: hoursAgo(50), about: about(1), text: "This is exactly how I felt watching it. Have you seen the director's earlier one?" },
    { id: "n7", kind: "follow", who: PEOPLE[0], at: hoursAgo(76) },
    { id: "n8", kind: "like", who: PEOPLE[1], at: hoursAgo(100), about: about(2) },
    { id: "n9", kind: "comment", who: PEOPLE[4], at: hoursAgo(150), about: about(2), text: "Great write-up. Adding it to my watchlist." },
    { id: "n10", kind: "follow", who: PEOPLE[2], at: hoursAgo(220) },
  ].filter((n) => n.kind === "follow" || n.about) as Notification[];
  cached = { at: Date.now(), list };
  return list;
}
