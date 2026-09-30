import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { LoginForm } from "./LoginForm";
import { accountsOpen } from "@/lib/accounts";

export const metadata: Metadata = { title: "Sign in — Kodigo", robots: { index: false } };

// Signing in, which is also signing up: one tap with Apple, Google or
// Facebook, or an email address that gets a link. Each provider's button
// appears once it's set up in Supabase and listed in NEXT_PUBLIC_SIGNIN_WITH
// ("apple,google,facebook"), since a button that fails is worse than none.
const PROVIDERS = ["apple", "google", "facebook"] as const;
const enabled = PROVIDERS.filter((p) => (process.env.NEXT_PUBLIC_SIGNIN_WITH ?? "").split(",").map((s) => s.trim().toLowerCase()).includes(p));
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";

export default async function Login({ searchParams }: PageProps<"/login">) {
  if (!accountsOpen) return <NotOpen />;
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/shows";
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-10 pb-20 flex-1">
        <div className="max-w-[288px] mx-auto grid grid-cols-[minmax(0,1fr)] gap-3">
          <div className={SHELL}>
            <div className="rounded-shell bg-piece p-4">
              <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase">Sign in</h1>
              <p className="m-0 mt-2 text-[12.5px] leading-[1.6] text-mid-tone">
                {intro(enabled.length > 0, process.env.NEXT_PUBLIC_EMAIL_CODE === "on")}
              </p>
              <LoginForm next={next} initialError={error} providers={enabled} />
            </div>
          </div>
          <p className="m-0 px-2 text-[12px] leading-[1.6] text-dim">
            By signing in you agree to the{" "}
            <Link href="/terms" className="text-accent no-underline hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-accent no-underline hover:underline">
              Privacy policy
            </Link>
            . You need to be 13 or older.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** The line under Sign in: what the ways in are. No password either way. */
function intro(oneTap: boolean, code: boolean): string {
  const byEmail = code ? "a code sent to your email" : "a link sent to your email";
  return `${oneTap ? `One tap, or ${byEmail}` : `No password: just ${byEmail}`}. The first time, that makes your account.`;
}

/** Before accounts open on the web: what every "Sign in" and "Sign up" leads to. */
function NotOpen() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-10 pb-20 flex-1">
        <div className="max-w-[288px] mx-auto">
          <div className={SHELL}>
            <div className="rounded-shell bg-piece p-4 grid gap-3">
              <h1 className="!text-[clamp(32px,4.4vw,48px)] !leading-[.95] tracking-[.02em] uppercase">Not open yet</h1>
              <p className="m-0 text-[12.5px] leading-[1.6] text-mid-tone">
                Kodigo accounts on the web are coming soon: your library, reviews, lists and profile, here and on your phone. Signing up and signing in aren&apos;t open yet.
              </p>
              <p className="m-0 text-[12.5px] leading-[1.6] text-mid-tone">Meanwhile, look around, or get the app.</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/about" className="inline-flex items-center h-10 px-5 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold no-underline">
                  Get the app
                </Link>
                <Link href="/shows" className="inline-flex items-center h-10 px-5 rounded-full bg-card border border-hair text-ink text-[12.5px] font-semibold no-underline hover:text-accent">
                  Explore
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
