import { NextResponse } from "next/server";
import { adminClient, unsubscribeQuery } from "@/lib/email-links";
import { notificationEmail, type EmailItem } from "@/lib/notification-email";

// Sends the notification emails that are due (docs/social-plan.md, step 4).
// Supabase calls this every ten minutes (pg_cron, supabase/cron/
// notification-emails.sql) with CRON_SECRET; the database decides who is due
// (public.claim_notification_emails: one email per person per batch, at most
// one an hour, settings and blocks respected) and this writes and sends them
// through Resend. A batch Resend refuses goes back in the queue.
export const dynamic = "force-dynamic";

const FROM = "Kodigo <notifications@kodigo.pro>";

function allowed(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}`;
  // Without a secret only a development server runs it, by hand.
  return process.env.NODE_ENV === "development";
}

type Due = { recipient: string; email: string; username: string; items: EmailItem[] };

export async function POST(request: Request) {
  if (!allowed(request)) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const key = process.env.RESEND_API_KEY;
  const db = adminClient();
  if (!key || !db) return NextResponse.json({ error: "Email isn't set up here (RESEND_API_KEY and SUPABASE_SERVICE_ROLE_KEY)." }, { status: 503 });

  const site = new URL(request.url).origin;
  const { data, error } = await db.rpc("claim_notification_emails", { max_people: 200 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  const failed: string[] = [];
  for (const due of (data ?? []) as Due[]) {
    const query = unsubscribeQuery(due.recipient);
    const page = `${site}/unsubscribe?${query}`;
    const oneClick = `${site}/api/email/unsubscribe?${query}`;
    const mail = notificationEmail(due.items, due.username, site, page);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [due.email],
        reply_to: "hello@kodigo.pro",
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        // Gmail's and Apple Mail's own Unsubscribe button, done in one tap.
        headers: { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      }),
    }).catch(() => null);
    if (res?.ok) sent++;
    else failed.push(...due.items.map((i) => i.id));
  }
  if (failed.length) await db.rpc("release_notification_emails", { ids: failed });
  return NextResponse.json({ sent, failed: failed.length > 0 ? (data ?? []).length - sent : 0 });
}
