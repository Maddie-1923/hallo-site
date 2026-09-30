import assert from "node:assert/strict";
import { alertsEmail, digestEmail, type DigestData } from "../digest-email";
import { dueNow, localClock } from "../email-schedule";

// The weekly digest and the day's reminders: what they say, and when they're due.
let failed = 0;
const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok    ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}\n${String(e)}`);
  }
};

const base: DigestData = { me: "laura", site: "https://kodigo.pro", unsubscribe: "https://kodigo.pro/unsubscribe?u=x&t=y", week: "22–28 Sep", stats: null, out: [], coming: [], friends: [] };
const row = { title: "Severance", href: "https://kodigo.pro/show/95396", poster: null, what: "S2 E7 and E8 · Thu and Fri", note: "You're 2 behind" };

test("an empty week sends nothing", () => {
  assert.equal(digestEmail(base), null);
  assert.equal(digestEmail({ ...base, stats: { episodes: 0, films: 0, minutes: 0, highlight: null } }), null);
});

test("the subject names the shows and a friend's review", () => {
  const mail = digestEmail({ ...base, out: [row], friends: [{ who: "marta", kind: "review", title: "Dune: Part Two", href: "x", poster: null, rating: 10, text: "Loved it", detail: null }] })!;
  assert.equal(mail.subject, "Your week on Kodigo: 1 show with new episodes, and what @marta thought of Dune: Part Two");
  assert.ok(mail.html.includes("Out this week from your shows") && mail.html.includes("From people you follow"));
  assert.ok(mail.html.includes("10/10") && !mail.html.includes("Coming next week"));
});

test("sections with nothing in them are left out", () => {
  const mail = digestEmail({ ...base, stats: { episodes: 14, films: 2, minutes: 725, highlight: "You finished Slow Horses." } })!;
  assert.ok(mail.html.includes("Your week") && mail.html.includes("12h") && mail.html.includes("You finished Slow Horses."));
  assert.ok(!mail.html.includes("From people you follow") && !mail.html.includes("Out this week"));
});

test("what people wrote can't break the email", () => {
  const mail = digestEmail({ ...base, friends: [{ who: "x", kind: "review", title: "<b>T</b>", href: "x", poster: null, rating: null, text: "<script>alert(1)</script>", detail: null }] })!;
  assert.ok(!mail.html.includes("<script>") && !mail.html.includes("<b>T</b>"));
});

test("reminders: nothing out today sends nothing; one title is named", () => {
  const empty = { me: "laura", site: "https://kodigo.pro", unsubscribe: "u", day: "Thursday 2 October", episodes: [], premieres: [], films: [], releases: [] };
  assert.equal(alertsEmail(empty), null);
  assert.equal(alertsEmail({ ...empty, episodes: [row] })!.subject, "Out today: Severance");
  const two = alertsEmail({ ...empty, episodes: [row], films: [{ ...row, title: "Dune" }] })!;
  assert.equal(two.subject, "Out today: Severance and 1 more");
  assert.ok(two.html.includes("New episodes today") && two.html.includes("Films out today") && !two.html.includes("New releases"));
  assert.equal(alertsEmail({ ...empty, releases: [{ ...row, title: "Wicked" }] })!.subject, "New today: Wicked");
});

test("the clock is the person's own", () => {
  const at = new Date("2026-10-04T01:30:00Z"); // Sunday 9:30 in Manila, Saturday evening in New York
  assert.deepEqual([localClock("Asia/Manila", at).weekday, localClock("Asia/Manila", at).hour, localClock("Asia/Manila", at).date], ["Sun", 9, "2026-10-04"]);
  assert.equal(localClock("America/New_York", at).weekday, "Sat");
  assert.equal(localClock("Not/AZone", at).zone, "UTC");
});

test("the digest is due Sunday at 9, the reminders every day at 8, only when switched on", () => {
  const sunday9 = new Date("2026-10-04T01:10:00Z"); // 09:10 in Manila
  const eight = new Date("2026-10-04T00:10:00Z"); // 08:10 in Manila
  const on = { timeZone: "Asia/Manila", weeklyDigest: true, alertEpisodes: true };
  assert.deepEqual(dueNow(on, sunday9), [{ kind: "digest", period: "2026-10-04" }]);
  assert.deepEqual(dueNow(on, eight), [{ kind: "alerts", period: "2026-10-04" }]);
  assert.deepEqual(dueNow({ timeZone: "Asia/Manila" }, sunday9), []);
  assert.deepEqual(dueNow({ ...on, weeklyDigest: false }, sunday9), []);
});

console.log(`digest-email.test.ts: ${failed ? `${failed} failed` : "all passed"}`);
if (failed) process.exitCode = 1;
