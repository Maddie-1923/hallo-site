// The weekly digest and the day's reminders, as emails (app/api/
// scheduled-emails): the design approved as a mock-up on 30 Sep 2026, in the
// sign-in email's look with smaller type for easy reading. Pure, so it's
// tested on its own (lib/__tests__/digest-email.test.ts); what goes in is
// gathered by lib/scheduled-emails.ts.

export interface Row {
  title: string;
  href: string;
  poster: string | null;
  /** "S2 E7 and E8 · Thu and Fri". */
  what: string;
  /** "You're 2 behind", "Up to date", "New season". */
  note?: string | null;
}

export interface Wide {
  title: string;
  href: string;
  image: string | null;
  what: string;
}

export interface FriendItem {
  who: string;
  kind: "review" | "rating" | "loved" | "list";
  title: string;
  href: string;
  poster: string | null;
  /** Out of 10, in half steps, as Kodigo rates. */
  rating: number | null;
  text: string | null;
  /** A list's line: "12 titles, starting with Arrival". */
  detail?: string | null;
}

export interface DigestData {
  me: string;
  site: string;
  unsubscribe: string;
  /** "22–28 Sep". */
  week: string;
  stats: { episodes: number; films: number; minutes: number; highlight: string | null } | null;
  out: Row[];
  coming: Wide[];
  friends: FriendItem[];
}

export interface AlertsData {
  me: string;
  site: string;
  unsubscribe: string;
  /** "Thursday 2 October". */
  day: string;
  episodes: Row[];
  premieres: Row[];
  films: Row[];
  releases: Row[];
}

export interface Email {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

const LABEL = "font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7a766c";
const CARD = "background:#ffffff;border-radius:16px;border:1px solid #e4dfd4";
const GAP = '<tr><td style="height:14px"></td></tr>';

function frame(head: string, body: string, button: { label: string; href: string }, footer: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f1ea;padding:24px 12px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a19">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
  <tr><td style="padding:0 4px 18px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle"><img src="https://kodigo.pro/email/kodigo-icon.png" width="36" height="36" alt="Kodigo" style="display:block;width:36px;height:36px;border-radius:9px;border:0" /></td>
      <td style="vertical-align:middle;padding-left:10px;font-size:17px;font-weight:700;letter-spacing:.02em;color:#122042">Kodigo</td>
      <td style="vertical-align:middle;padding-left:12px;font-size:12px;color:#7a766c">${esc(head)}</td>
    </tr></table>
  </td></tr>
  ${body}
  <tr><td style="height:18px"></td></tr>
  <tr><td align="center"><a href="${esc(button.href)}" style="display:inline-block;background:#122042;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;padding:11px 22px;border-radius:999px">${esc(button.label)}</a></td></tr>
  <tr><td style="padding:22px 4px 0;font-size:11px;line-height:1.6;color:#8c877c;text-align:center">${footer}</td></tr>
</table>
</td></tr>
</table>`;
}

function footer(why: string, site: string, unsubscribe: string) {
  return `${esc(why)}<br />
    <a href="${esc(`${site}/settings#alerts`)}" style="color:#8c877c;text-decoration:underline">Choose which emails</a> &middot; <a href="${esc(unsubscribe)}" style="color:#8c877c;text-decoration:underline">Unsubscribe from all</a><br />
    Kodigo &middot; <a href="https://kodigo.pro" style="color:#8c877c;text-decoration:underline">kodigo.pro</a>`;
}

function poster(src: string | null) {
  return src ? `<img src="${esc(src)}" width="40" height="60" alt="" style="display:block;width:40px;height:60px;border-radius:6px;object-fit:cover" />` : '<div style="width:40px;height:60px;border-radius:6px;background:#eee9df"></div>';
}

function rowsCard(label: string, rows: Row[]) {
  const items = rows
    .map(
      (r) => `<tr><td style="padding:10px 0;border-top:1px solid #eee9df">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:top"><a href="${esc(r.href)}">${poster(r.poster)}</a></td>
          <td style="vertical-align:top;padding-left:12px"><a href="${esc(r.href)}" style="font-size:13px;font-weight:600;color:#122042;text-decoration:none">${esc(r.title)}</a><div style="font-size:12px;color:#4a4740">${esc(r.what)}</div>${r.note ? `<div style="font-size:11px;color:#7a766c;margin-top:2px">${esc(r.note)}</div>` : ""}</td>
        </tr></table>
      </td></tr>`,
    )
    .join("");
  return `<tr><td style="${CARD};padding:20px 22px 8px"><div style="${LABEL}">${esc(label)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px">${items}</table></td></tr>`;
}

function hearts(rating: number) {
  return `<span style="color:#d9485c">&#9829;</span> ${String(rating).replace(/\.0$/, "")}/10`;
}

function friendLine(f: FriendItem) {
  const who = `<b style="color:#122042">@${esc(f.who)}</b>`;
  const t = `<b style="color:#122042">${esc(f.title)}</b>`;
  switch (f.kind) {
    case "review":
      return `${who} reviewed ${t}${f.rating != null ? ` &nbsp;${hearts(f.rating)}` : ""}`;
    case "rating":
      return `${who} rated ${t}${f.rating != null ? ` &nbsp;${hearts(f.rating)}` : ""}`;
    case "loved":
      return `${who} loved ${t} &nbsp;<span style="color:#d9485c">&#9829;</span>`;
    case "list":
      return `${who} made a list: ${t}`;
  }
}

function friendsCard(friends: FriendItem[]) {
  const items = friends
    .map(
      (f) => `<tr><td style="padding:12px 0;border-top:1px solid #eee9df">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:top"><a href="${esc(f.href)}">${poster(f.poster)}</a></td>
          <td style="vertical-align:top;padding-left:12px">
            <div style="font-size:12.5px;color:#4a4740"><a href="${esc(f.href)}" style="color:#4a4740;text-decoration:none">${friendLine(f)}</a></div>
            ${f.kind === "review" && f.text ? `<div style="font-size:12.5px;line-height:1.5;color:#4a4740;margin-top:4px">&ldquo;${esc(clip(f.text, 180))}&rdquo;</div>` : ""}
            ${f.detail ? `<div style="font-size:11px;color:#7a766c;margin-top:2px">${esc(f.detail)}</div>` : ""}
          </td>
        </tr></table>
      </td></tr>`,
    )
    .join("");
  return `<tr><td style="${CARD};padding:20px 22px 8px"><div style="${LABEL}">From people you follow</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px">${items}</table></td></tr>`;
}

function comingCard(coming: Wide[]) {
  const cells = coming.slice(0, 2).map(
    (w, i) => `<td style="width:50%;vertical-align:top;${i === 0 ? "padding-right:6px" : "padding-left:6px"}">
        <a href="${esc(w.href)}">${w.image ? `<img src="${esc(w.image)}" width="100%" alt="" style="display:block;width:100%;border-radius:10px" />` : ""}</a>
        <div style="font-size:12.5px;font-weight:600;color:#122042;margin-top:8px">${esc(w.title)}</div>
        <div style="font-size:11px;color:#7a766c">${esc(w.what)}</div>
      </td>`,
  );
  if (cells.length === 1) cells.push('<td style="width:50%"></td>');
  const more = coming.slice(2).map((w) => `<div style="font-size:12px;color:#4a4740;margin-top:8px"><a href="${esc(w.href)}" style="color:#122042;font-weight:600;text-decoration:none">${esc(w.title)}</a> &middot; ${esc(w.what)}</div>`);
  return `<tr><td style="${CARD};padding:20px 22px"><div style="${LABEL}">Coming next week</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px"><tr>${cells.join("")}</tr></table>${more.join("")}</td></tr>`;
}

function statsCard(s: NonNullable<DigestData["stats"]>) {
  const hours = s.minutes >= 60 ? `${Math.round(s.minutes / 60)}h` : `${s.minutes}m`;
  const cell = (n: string, label: string, first: boolean) =>
    `<td align="center" style="width:33%${first ? "" : ";border-left:1px solid #eee9df"}"><div style="font-size:24px;font-weight:700;color:#122042;line-height:1">${n}</div><div style="font-size:11px;color:#7a766c;margin-top:4px">${label}</div></td>`;
  return `<tr><td style="${CARD};padding:20px 22px">
    <div style="${LABEL}">Your week</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px"><tr>${cell(String(s.episodes), s.episodes === 1 ? "episode" : "episodes", true)}${cell(String(s.films), s.films === 1 ? "film" : "films", false)}${cell(hours, "watched", false)}</tr></table>
    ${s.highlight ? `<div style="margin-top:14px;font-size:12px;color:#4a4740;text-align:center">${esc(s.highlight)}</div>` : ""}
  </td></tr>`;
}

/** The weekly digest, or null when there's nothing to say. */
export function digestEmail(d: DigestData): Email | null {
  const stats = d.stats && d.stats.episodes + d.stats.films > 0 ? d.stats : null;
  const parts: string[] = [];
  if (stats) parts.push(statsCard(stats));
  if (d.out.length) parts.push(rowsCard("Out this week from your shows", d.out.slice(0, 6)));
  if (d.coming.length) parts.push(comingCard(d.coming.slice(0, 5)));
  if (d.friends.length) parts.push(friendsCard(d.friends.slice(0, 6)));
  if (!parts.length) return null;

  const episodes = d.out.length;
  const review = d.friends.find((f) => f.kind === "review");
  const bits = [episodes ? `${episodes} ${episodes === 1 ? "show" : "shows"} with new episodes` : null, review ? `what @${review.who} thought of ${clip(review.title, 40)}` : null].filter(Boolean);
  const subject = bits.length ? `Your week on Kodigo: ${bits.join(", and ")}` : "Your week on Kodigo";

  const html = frame(`Your week · ${d.week}`, parts.join(GAP), { label: "Open your Calendar", href: `${d.site}/calendar` }, footer(`The weekly digest comes on Sunday mornings because it's on for @${d.me}.`, d.site, d.unsubscribe));
  const text = [
    `Your week on Kodigo · ${d.week}`,
    "",
    ...(stats ? [`Your week: ${stats.episodes} episodes, ${stats.films} films.${stats.highlight ? ` ${stats.highlight}` : ""}`, ""] : []),
    ...(d.out.length ? ["Out this week from your shows:", ...d.out.slice(0, 6).map((r) => `- ${r.title}: ${r.what}${r.note ? ` (${r.note})` : ""} ${r.href}`), ""] : []),
    ...(d.coming.length ? ["Coming next week:", ...d.coming.slice(0, 5).map((w) => `- ${w.title}: ${w.what} ${w.href}`), ""] : []),
    ...(d.friends.length ? ["From people you follow:", ...d.friends.slice(0, 6).map((f) => `- @${f.who} ${f.kind === "review" ? "reviewed" : f.kind === "rating" ? "rated" : f.kind === "loved" ? "loved" : "made a list:"} ${f.title}${f.rating != null ? ` (${f.rating}/10)` : ""} ${f.href}`), ""] : []),
    `Open your Calendar: ${d.site}/calendar`,
    "",
    `Choose which emails: ${d.site}/settings#alerts`,
    `Unsubscribe from all: ${d.unsubscribe}`,
  ].join("\n");
  return { subject, html, text };
}

/** The day's reminders, or null when nothing is out today. */
export function alertsEmail(d: AlertsData): Email | null {
  const sections: [string, Row[]][] = [
    ["New episodes today", d.episodes],
    ["Premieres and new seasons", d.premieres],
    ["Films out today", d.films],
    ["New releases", d.releases],
  ];
  const shown = sections.filter(([, rows]) => rows.length > 0);
  if (!shown.length) return null;

  const mine = [...d.premieres, ...d.episodes, ...d.films];
  const subject = mine.length === 1 ? `Out today: ${mine[0].title}` : mine.length > 1 ? `Out today: ${mine[0].title} and ${mine.length - 1} more` : `New today: ${d.releases[0].title}${d.releases.length > 1 ? ` and ${d.releases.length - 1} more` : ""}`;

  const html = frame(d.day, shown.map(([label, rows]) => rowsCard(label, rows.slice(0, 8))).join(GAP), { label: "Open your Calendar", href: `${d.site}/calendar` }, footer(`These reminders come in your morning because they're on for @${d.me}.`, d.site, d.unsubscribe));
  const text = [
    `Out today · ${d.day}`,
    "",
    ...shown.flatMap(([label, rows]) => [`${label}:`, ...rows.slice(0, 8).map((r) => `- ${r.title}: ${r.what} ${r.href}`), ""]),
    `Open your Calendar: ${d.site}/calendar`,
    "",
    `Choose which emails: ${d.site}/settings#alerts`,
    `Unsubscribe from all: ${d.unsubscribe}`,
  ].join("\n");
  return { subject, html, text };
}
