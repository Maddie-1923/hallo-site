import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { unsubscribeAll, validUnsubscribe } from "@/lib/email-links";

export const metadata: Metadata = { title: "Unsubscribe — Kodigo", robots: { index: false } };

// Where "Unsubscribe from all" in a notification email lands. It asks before
// switching anything off, because some mail systems open every link in an
// email to check it; no sign-in needed, the link's signature proves whose
// emails these are (lib/email-links.ts).
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";
const button = "h-10 px-5 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold cursor-pointer";

async function stop(form: FormData) {
  "use server";
  const u = String(form.get("u") ?? "");
  const t = String(form.get("t") ?? "");
  if (!validUnsubscribe(u, t)) redirect("/unsubscribe");
  const ok = await unsubscribeAll(u);
  redirect(ok ? "/unsubscribe?done=1" : `/unsubscribe?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}&failed=1`);
}

export default async function Unsubscribe({ searchParams }: PageProps<"/unsubscribe">) {
  const p = await searchParams;
  const u = typeof p.u === "string" ? p.u : null;
  const t = typeof p.t === "string" ? p.t : null;
  const done = p.done === "1";
  const valid = validUnsubscribe(u, t);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-10 pb-20 flex-1">
        <div className="max-w-[460px] mx-auto">
          <div className={SHELL}>
            <div className="rounded-shell bg-piece p-4 grid gap-3">
              <h1 className="!text-[clamp(32px,4.4vw,48px)] !leading-[.95] tracking-[.02em] uppercase">{done ? "Unsubscribed" : "Email settings"}</h1>
              {done ? (
                <p className="m-0 text-[12.5px] leading-[1.6] text-mid-tone">
                  You won&apos;t get notification emails any more. You&apos;ll still see everything in the bell on Kodigo, and sign-in emails still come when you ask for them. To turn some back on, go to{" "}
                  <Link href="/settings#notifications" className="text-accent no-underline hover:underline">
                    Settings → Notifications
                  </Link>
                  .
                </p>
              ) : valid ? (
                <form action={stop} className="grid gap-3">
                  <p className="m-0 text-[12.5px] leading-[1.6] text-mid-tone">Stop all notification emails from Kodigo for this account? Follows, likes and comments will still show in the bell on the site.</p>
                  <input type="hidden" name="u" value={u} />
                  <input type="hidden" name="t" value={t ?? ""} />
                  {p.failed === "1" && <p className="m-0 text-[12.5px] text-loved">That didn&apos;t go through. Try again in a moment.</p>}
                  <div>
                    <button type="submit" className={button}>
                      Unsubscribe from all
                    </button>
                  </div>
                </form>
              ) : (
                <p className="m-0 text-[12.5px] leading-[1.6] text-mid-tone">
                  This link isn&apos;t valid. Choose which emails you get in{" "}
                  <Link href="/settings#notifications" className="text-accent no-underline hover:underline">
                    Settings → Notifications
                  </Link>
                  , or write to hello@kodigo.pro.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
