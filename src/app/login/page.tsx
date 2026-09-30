import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in — Kodigo", robots: { index: false } };

// Signing in, which is also signing up: an email address gets a link, and
// the link is the password. Apple appears once its sign-in is set up for the
// site (NEXT_PUBLIC_APPLE_SIGNIN=on), since a button that fails is worse
// than none.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/library";
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-10 pb-20 flex-1">
        <div className="max-w-[460px] mx-auto grid grid-cols-[minmax(0,1fr)] gap-3">
          <div className={SHELL}>
            <div className="rounded-shell bg-piece p-4">
              <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase">Sign in</h1>
              <p className="m-0 mt-2 text-[12.5px] leading-[1.6] text-mid-tone">
                No password: we email you a link, you open it, and you&apos;re in. The first time, that makes your account.
              </p>
              <LoginForm next={next} initialError={error} apple={process.env.NEXT_PUBLIC_APPLE_SIGNIN === "on"} />
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
