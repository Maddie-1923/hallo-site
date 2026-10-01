import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Delete your account — Kodigo",
  description: "How to delete your Kodigo account and what is deleted with it.",
};

// The public page on deleting a Kodigo account, which the app stores ask a
// developer to have on the web (Google Play in particular): how to do it,
// what goes, what stays, and who to write to if you can't.
export default function DeleteAccountPage() {
  const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";
  const H = "inline-flex items-center h-[2.8333rem] px-4 rounded-full bg-piece ![font-family:var(--font-body)] !font-bold !text-[0.875rem] !leading-none !tracking-[.12em] uppercase text-ink";
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <div className="max-w-[60rem] mx-auto grid grid-cols-[minmax(0,1fr)] gap-8">
          <div className={SHELL}>
            <div className="rounded-shell bg-piece p-3">
              <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase">Delete your account</h1>
              <p className="m-0 mt-2 text-[1.0417rem] leading-[1.6] text-mid-tone">You can delete your Kodigo account yourself at any time, from the app or on this website. It takes effect straight away.</p>
            </div>
          </div>

          {[
            [
              "In the app",
              <ol key="a" className="m-0 pl-5 grid gap-1.5 text-[1.0417rem] leading-[1.6] text-ink">
                <li>Open Kodigo and go to Settings.</li>
                <li>Choose Backup &amp; Sync, then Kodigo sync.</li>
                <li>Choose Delete account, and confirm.</li>
              </ol>,
            ],
            [
              "On the website",
              <p key="w" className="m-0 text-[1.0417rem] leading-[1.6] text-ink">
                Signed in, open{" "}
                <Link href="/settings#delete" className="text-accent no-underline hover:underline">
                  Settings
                </Link>
                , go to Delete account, type DELETE and confirm.
              </p>,
            ],
            [
              "What is deleted",
              <p key="d" className="m-0 text-[1.0417rem] leading-[1.6] text-ink">Your sign-in and email address, the copy of your library kept on Kodigo&apos;s server, and your profile, with your reviews, lists, follows and likes. Nothing is kept back, and it can&apos;t be undone.</p>,
            ],
            [
              "What stays",
              <p key="s" className="m-0 text-[1.0417rem] leading-[1.6] text-ink">The library on your phone stays exactly as it is, and any backup file you&apos;ve saved is yours and stays where you put it. A subscription is managed by Apple or Google, so cancel it there too.</p>,
            ],
            [
              "Can't sign in?",
              <p key="c" className="m-0 text-[1.0417rem] leading-[1.6] text-ink">
                Write to{" "}
                <a href="mailto:hello@kodigo.pro?subject=Delete%20my%20Kodigo%20account" className="text-accent no-underline hover:underline">
                  hello@kodigo.pro
                </a>{" "}
                from the email address on the account, and it will be deleted within 7 days.
              </p>,
            ],
          ].map(([title, body]) => (
            <section key={title as string} className="grid grid-cols-[minmax(0,1fr)] gap-2">
              <div>
                <h2 className={H}>{title}</h2>
              </div>
              <div className={SHELL}>
                <div className="rounded-shell bg-piece p-3">{body}</div>
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
