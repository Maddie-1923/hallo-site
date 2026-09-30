// A batch of someone's notifications as one email (app/api/notification-emails):
// the subject, the HTML in the sign-in email's design
// (supabase/templates/sign-in.html) and a plain-text copy. Pure, so it's
// tested on its own (scripts/test-notification-email.ts).

export interface EmailItem {
  id: string;
  kind: "follow" | "follow_request" | "follow_accepted" | "like" | "comment";
  who: string;
  targetKind: "review" | "list" | null;
  target: string | null;
  /** The review's title or the list's name, when the public copy has it. */
  subject: string | null;
  text: string | null;
  at: string;
}

export interface NotificationEmail {
  subject: string;
  html: string;
  text: string;
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** What happened, in words: "@marta liked your review of Arrival". */
export function describe(item: EmailItem): string {
  const who = `@${item.who}`;
  const what =
    item.targetKind === "review" ? (item.subject ? `your review of ${item.subject}` : "your review") : item.targetKind === "list" ? (item.subject ? `your list ${item.subject}` : "your list") : "";
  switch (item.kind) {
    case "follow":
      return `${who} started following you`;
    case "follow_request":
      return `${who} asked to follow you`;
    case "follow_accepted":
      return `${who} accepted your follow request`;
    case "like":
      return `${who} liked ${what}`;
    case "comment":
      return `${who} commented on ${what}`;
  }
}

/** Where each one goes on the site. */
export function linkFor(item: EmailItem, me: string, site: string): string {
  if (item.kind === "follow_request") return `${site}/notifications`;
  if (item.targetKind === "review" && item.target) return `${site}/u/${me}/review/${item.target}`;
  if (item.targetKind === "list" && item.target) return `${site}/u/${me}/list/${item.target}`;
  return `${site}/u/${item.who}`;
}

export function notificationEmail(items: EmailItem[], me: string, site: string, unsubscribe: string): NotificationEmail {
  const shown = items.slice(0, 10);
  const more = items.length - shown.length;
  const subject = items.length === 1 ? `${describe(items[0])} on Kodigo` : `${items.length} new notifications on Kodigo`;
  const heading = items.length === 1 ? "Something new on Kodigo" : `${items.length} new notifications`;

  const rows = shown
    .map((item) => {
      const quote = item.kind === "comment" && item.text ? `<div style="margin-top:4px;font-size:14px;line-height:1.5;color:#4a4740">&ldquo;${escape(item.text.length > 160 ? `${item.text.slice(0, 157)}...` : item.text)}&rdquo;</div>` : "";
      return `<tr><td style="padding:12px 0;border-top:1px solid #eee9df"><a href="${escape(linkFor(item, me, site))}" style="color:#122042;text-decoration:none;font-size:15px;line-height:1.45;font-weight:600">${escape(describe(item))}</a>${quote}</td></tr>`;
    })
    .join("");
  const moreRow = more > 0 ? `<tr><td style="padding:12px 0;border-top:1px solid #eee9df;font-size:14px;color:#7a766c">and ${more} more</td></tr>` : "";

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f1ea;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a19">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px">
      <tr><td style="padding:0 4px 18px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle"><img src="https://kodigo.pro/email/kodigo-icon.png" width="40" height="40" alt="Kodigo" style="display:block;width:40px;height:40px;border-radius:10px;border:0" /></td>
          <td style="vertical-align:middle;padding-left:10px;font-size:20px;font-weight:700;letter-spacing:.02em;color:#122042">Kodigo</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:16px;padding:28px 28px 24px;border:1px solid #e4dfd4">
        <h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;font-weight:700;color:#1a1a19">${escape(heading)}</h1>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}${moreRow}</table>
        <a href="${escape(`${site}/notifications`)}" style="display:inline-block;margin-top:18px;background:#122042;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:999px">See it on Kodigo</a>
      </td></tr>
      <tr><td style="padding:18px 4px 0;font-size:12px;line-height:1.6;color:#8c877c;text-align:center">
        You're getting this because notification emails are on for @${escape(me)}.<br />
        <a href="${escape(`${site}/settings#notifications`)}" style="color:#8c877c;text-decoration:underline">Choose which ones</a> &middot; <a href="${escape(unsubscribe)}" style="color:#8c877c;text-decoration:underline">Unsubscribe from all</a><br />
        Kodigo &middot; <a href="https://kodigo.pro" style="color:#8c877c;text-decoration:underline">kodigo.pro</a>
      </td></tr>
    </table>
  </td></tr>
</table>`;

  const text = [
    heading,
    "",
    ...shown.flatMap((item) => [`${describe(item)}${item.kind === "comment" && item.text ? `: "${item.text}"` : ""}`, linkFor(item, me, site), ""]),
    ...(more > 0 ? [`and ${more} more`, ""] : []),
    `See it on Kodigo: ${site}/notifications`,
    "",
    `Choose which emails you get: ${site}/settings#notifications`,
    `Unsubscribe from all: ${unsubscribe}`,
  ].join("\n");

  return { subject, html, text };
}
