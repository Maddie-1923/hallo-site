import type { Settings } from "./settings-shape";

// When the weekly digest and the day's reminders are due for someone, in
// their own time zone (app/api/scheduled-emails runs every hour). Pure, so
// it's tested (lib/__tests__/digest-email.test.ts).

export type Due = { kind: "digest" | "alerts"; period: string };

/** Their local date, weekday and hour, in their own time zone (UTC when unknown). */
export function localClock(zone: string, now = new Date()) {
  let tz = zone || "UTC";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
  } catch {
    tz = "UTC";
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(now).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), weekday: parts.weekday as string, zone: tz };
}

/** What's due for someone this hour: the digest on Sunday at 9, the reminders every day at 8. */
export function dueNow(s: Partial<Settings>, now = new Date()): Due[] {
  const c = localClock(s.timeZone ?? "", now);
  const out: Due[] = [];
  if (s.weeklyDigest && c.weekday === "Sun" && c.hour === 9) out.push({ kind: "digest", period: c.date });
  if ((s.alertEpisodes || s.alertSeasons || s.alertFilms || s.alertReleases) && c.hour === 8) out.push({ kind: "alerts", period: c.date });
  return out;
}
