import { NextResponse } from "next/server";
import { adminClient, unsubscribeQuery } from "@/lib/email-links";
import { cronAllowed } from "@/lib/cron-auth";
import { alertsEmail, digestEmail, type Email } from "@/lib/digest-email";
import { gatherAlerts, gatherDigest } from "@/lib/scheduled-emails";
import { dueNow, localClock, type Due } from "@/lib/email-schedule";
import type { Settings } from "@/lib/settings-shape";

// The weekly digest (Sunday 9am) and the day's reminders (8am), each in the
// person's own time zone (docs/social-plan.md, "Email alerts"). Supabase
// calls this every hour (supabase/cron/scheduled-emails.sql) with
// CRON_SECRET; each email goes once, recorded in scheduled_email_log before
// it's sent and un-recorded if Resend refuses it.
//
// For trying it out, on a laptop or a Vercel preview only:
//   ?preview=digest|alerts&user=<username>[&date=YYYY-MM-DD]  → the email, shown
//   ?send=digest|alerts&user=<username>[&date=…]              → sent to them now
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FROM = "Kodigo <notifications@kodigo.pro>";
const testing = () => process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";


type Person = { user_id: string; settings: Partial<Settings> };

async function build(db: NonNullable<ReturnType<typeof adminClient>>, site: string, p: Person, due: Due): Promise<{ to: string; mail: Email } | null> {
  const [{ data: prof }, { data: user }] = await Promise.all([db.from("profiles").select("username").eq("user_id", p.user_id).maybeSingle(), db.auth.admin.getUserById(p.user_id)]);
  const me = prof?.username;
  const to = user?.user?.email;
  if (!me || !to) return null;
  const unsubscribe = `${site}/unsubscribe?${unsubscribeQuery(p.user_id)}`;
  const abs = <T extends { href: string }>(x: T): T => ({ ...x, href: x.href.startsWith("/") ? `${site}${x.href}` : x.href });
  if (due.kind === "digest") {
    const d = await gatherDigest(db, p.user_id, due.period);
    const mail = digestEmail({ ...d, out: d.out.map(abs), coming: d.coming.map(abs), friends: d.friends.map(abs), me, site, unsubscribe });
    return mail && { to, mail };
  }
  const d = await gatherAlerts(db, p.user_id, p.settings, due.period, p.settings.region ?? "US");
  const mail = alertsEmail({ ...d, episodes: d.episodes.map(abs), premieres: d.premieres.map(abs), films: d.films.map(abs), releases: d.releases.map(abs), me, site, unsubscribe });
  return mail && { to, mail };
}

async function send(to: string, mail: Email, unsubscribeURL: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: "hello@kodigo.pro",
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers: { "List-Unsubscribe": `<${unsubscribeURL}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  }).catch(() => null);
  return !!res?.ok;
}

export async function GET(request: Request) {
  // Only the test view answers a plain visit.
  const url = new URL(request.url);
  if (!testing() || !url.searchParams.get("preview")) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return POST(request);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const site = url.origin;
  const db = adminClient();
  if (!db) return NextResponse.json({ error: "Needs SUPABASE_SECRET_KEY." }, { status: 503 });

  // Trying it out: one person, now.
  const trial = url.searchParams.get("preview") ?? url.searchParams.get("send");
  if (trial) {
    if (!testing()) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (trial !== "digest" && trial !== "alerts") return NextResponse.json({ error: "digest or alerts" }, { status: 400 });
    const { data: prof } = await db.from("profiles").select("user_id").eq("username", (url.searchParams.get("user") ?? "").toLowerCase()).maybeSingle();
    if (!prof) return NextResponse.json({ error: "No such member." }, { status: 404 });
    const { data: row } = await db.from("user_settings").select("settings").eq("user_id", prof.user_id).maybeSingle();
    const settings = { alertEpisodes: true, alertSeasons: true, alertFilms: true, alertReleases: true, ...((row?.settings as Partial<Settings>) ?? {}) };
    const date = url.searchParams.get("date") ?? localClock(settings.timeZone ?? "").date;
    const built = await build(db, site, { user_id: prof.user_id, settings }, { kind: trial, period: date });
    if (!built) return new NextResponse("<p>Nothing to send for this day.</p>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (url.searchParams.get("preview")) return new NextResponse(`<p style="font-family:sans-serif;font-size:13px;padding:8px 16px;margin:0;background:#fff"><b>Subject:</b> ${built.mail.subject.replace(/</g, "&lt;")}</p>${built.mail.html}`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Needs RESEND_API_KEY." }, { status: 503 });
    const ok = await send(built.to, built.mail, `${site}/api/email/unsubscribe?${unsubscribeQuery(prof.user_id)}`);
    return NextResponse.json({ sent: ok });
  }

  // The hourly run.
  if (!(await cronAllowed(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Needs RESEND_API_KEY." }, { status: 503 });
  const { data: people } = await db.from("user_settings").select("user_id, settings").limit(5000);
  let sent = 0;
  let skipped = 0;
  for (const p of (people ?? []) as Person[]) {
    for (const due of dueNow(p.settings ?? {})) {
      // Claimed first, so two runs at once can't both send it.
      const { error: taken } = await db.from("scheduled_email_log").insert({ user_id: p.user_id, kind: due.kind, period: due.period });
      if (taken) continue;
      const built = await build(db, site, p, due).catch(() => null);
      if (!built) {
        skipped++;
        continue;
      }
      if (await send(built.to, built.mail, `${site}/api/email/unsubscribe?${unsubscribeQuery(p.user_id)}`)) sent++;
      else await db.from("scheduled_email_log").delete().eq("user_id", p.user_id).eq("kind", due.kind).eq("period", due.period);
    }
  }
  return NextResponse.json({ sent, nothingToSay: skipped });
}
