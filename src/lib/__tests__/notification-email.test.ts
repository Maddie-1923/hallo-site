import assert from "node:assert/strict";
import { describe, linkFor, notificationEmail, type EmailItem } from "../notification-email";

// The notification email's words and links (lib/notification-email.ts).
const site = "https://kodigo.pro";
const item = (fields: Partial<EmailItem>): EmailItem => ({ id: "1", kind: "follow", who: "marta", targetKind: null, target: null, subject: null, text: null, at: "2026-09-30T10:00:00Z", ...fields });
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

test("each kind reads as a sentence", () => {
  assert.equal(describe(item({})), "@marta started following you");
  assert.equal(describe(item({ kind: "follow_request" })), "@marta asked to follow you");
  assert.equal(describe(item({ kind: "follow_accepted" })), "@marta accepted your follow request");
  assert.equal(describe(item({ kind: "like", targetKind: "review", target: "m329865", subject: "Arrival" })), "@marta liked your review of Arrival");
  assert.equal(describe(item({ kind: "like", targetKind: "list", target: "L1", subject: "Comfort watches" })), "@marta liked your list Comfort watches");
  assert.equal(describe(item({ kind: "comment", targetKind: "list", target: "L1" })), "@marta commented on your list");
});

test("each goes to its page", () => {
  assert.equal(linkFor(item({}), "laura", site), "https://kodigo.pro/u/marta");
  assert.equal(linkFor(item({ kind: "follow_request" }), "laura", site), "https://kodigo.pro/notifications");
  assert.equal(linkFor(item({ kind: "like", targetKind: "review", target: "m329865" }), "laura", site), "https://kodigo.pro/u/laura/review/m329865");
  assert.equal(linkFor(item({ kind: "comment", targetKind: "list", target: "L1" }), "laura", site), "https://kodigo.pro/u/laura/list/L1");
});

test("one notification makes the subject; several are counted", () => {
  assert.equal(notificationEmail([item({})], "laura", site, "U").subject, "@marta started following you on Kodigo");
  assert.equal(notificationEmail([item({}), item({ id: "2", who: "joel" })], "laura", site, "U").subject, "2 new notifications on Kodigo");
});

test("what people wrote can't break the email", () => {
  const mail = notificationEmail([item({ kind: "comment", targetKind: "list", target: "L1", subject: "<b>Lists</b>", text: '<script>alert("x")</script> & more' })], "laura", site, "U");
  assert.ok(!mail.html.includes("<script>") && !mail.html.includes("<b>Lists</b>"));
  assert.ok(mail.html.includes("&lt;script&gt;") && mail.html.includes("&amp; more"));
});

test("ten are listed, the rest counted, and the unsubscribe link is in both copies", () => {
  const many = Array.from({ length: 13 }, (_, i) => item({ id: String(i), who: `p${i}` }));
  const mail = notificationEmail(many, "laura", site, "https://kodigo.pro/unsubscribe?u=x&t=y");
  assert.equal((mail.html.match(/started following you/g) ?? []).length, 10);
  assert.ok(mail.html.includes("and 3 more") && mail.text.includes("and 3 more"));
  assert.ok(mail.html.includes("unsubscribe?u=x&amp;t=y") && mail.text.includes("unsubscribe?u=x&t=y"));
});

console.log(`notification-email.test.ts: ${failed ? `${failed} failed` : "all passed"}`);
if (failed) process.exitCode = 1;
