
// Notifications: someone followed you, liked your review or list, or
// replied to it, from the social tables (lib/my-notifications.ts). Which
// kinds show follows Settings, Notifications.
export type NotificationKind = "follow" | "follow_request" | "follow_accepted" | "like" | "comment";

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
  /** Where it goes, whether it's about a review or a list, and whether
      it's been read. */
  href?: string;
  target?: "review" | "list";
  read?: boolean;
}
