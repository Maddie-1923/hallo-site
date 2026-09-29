// What a report is, shared by the browser (lib/safety.ts) and the server
// (lib/safety-actions.ts).

export type ReportKind = "review" | "comment" | "list" | "profile";

export const REPORT_REASONS = [
  ["spam", "Spam or scam", "Advertising, fake engagement, or links to something harmful."],
  ["harassment", "Harassment or bullying", "Targeting a person with insults, threats or unwanted attention."],
  ["hate", "Hate", "Attacking people for who they are: race, religion, gender, sexuality, disability."],
  ["sexual", "Sexual or violent content", "Graphic, explicit or shocking material."],
  ["private", "Private information", "Someone's address, phone number, photos or other personal details."],
  ["impersonation", "Pretending to be someone", "A profile posing as another person or organisation."],
  ["spoilers", "Unmarked spoilers", "Gives away a plot without a spoiler warning."],
  ["copyright", "Copyright", "Someone else's work, or links to pirated copies."],
  ["other", "Something else", "Tell us what's wrong below."],
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number][0];

export interface Report {
  id: string;
  kind: ReportKind;
  /** The reported thing's own id: a review key, a comment id, a list id, or a username for a profile. */
  target: string;
  /** Whose it is. */
  author: string;
  /** Where to see it. */
  href: string;
  /** A few words of it, so the report still makes sense if it changes. */
  excerpt: string;
  reason: ReportReason;
  note: string;
  reporter: string;
  at: string;
  status: "open" | "dismissed" | "removed" | "suspended";
}
