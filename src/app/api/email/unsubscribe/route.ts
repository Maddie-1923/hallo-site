import { NextResponse } from "next/server";
import { unsubscribeAll, validUnsubscribe } from "@/lib/email-links";

// One-click unsubscribe (RFC 8058): what Gmail's and Apple Mail's own
// Unsubscribe button posts, from the List-Unsubscribe header of every
// notification email. The link in the email itself goes to /unsubscribe,
// which asks first, so a mail scanner opening links switches nothing off.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const uid = url.searchParams.get("u");
  if (!validUnsubscribe(uid, url.searchParams.get("t"))) return NextResponse.json({ error: "That link isn't valid." }, { status: 400 });
  const ok = await unsubscribeAll(uid);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Try again in a moment." }, { status: 500 });
}
