import "server-only";
import type { Notification } from "@/lib/notifications";
import { loadNotifications } from "@/lib/social-actions";

// The signed-in person's notifications in the shape the bell and the page
// draw (components/Notifications.tsx); null signed out or before accounts.
export async function myNotifications(): Promise<Notification[] | null> {
  const list = await loadNotifications().catch(() => null);
  if (!list) return null;
  return list.map((n) => ({
    id: n.id,
    kind: n.kind,
    who: n.who.username,
    at: n.at,
    about: n.subject ? { title: n.subject.title, poster: n.subject.poster, href: n.href } : undefined,
    text: n.text ?? undefined,
    href: n.href,
    target: n.about === "your list" ? "list" : n.about === "your review" ? "review" : undefined,
    read: n.read,
  }));
}
