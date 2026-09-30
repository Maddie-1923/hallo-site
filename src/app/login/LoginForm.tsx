"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const input = "w-full h-10 px-4 rounded-full bg-card border border-hair text-[13px] text-ink placeholder:text-dim focus:outline-none focus:border-accent";
const primary = "w-full h-10 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-default";
const quiet = "w-full h-10 rounded-full bg-card border border-hair text-ink text-[12.5px] font-semibold cursor-pointer hover:text-accent transition-colors";

export function LoginForm({ next, initialError, apple = false }: { next: string; initialError?: string; apple?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | undefined>(initialError);

  const callback = () => `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(undefined);
    const { error } = await createClient().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: callback() } });
    if (error) {
      setError(/rate|seconds/i.test(error.message) ? "A link was sent a moment ago. Give it a minute, then ask again." : "That didn't send. Check the address and try again.");
      setState("idle");
    } else {
      setState("sent");
    }
  }

  async function signInWithApple() {
    setError(undefined);
    const { error } = await createClient().auth.signInWithOAuth({ provider: "apple", options: { redirectTo: callback() } });
    if (error) setError("Sign in with Apple didn't start. Try the email link instead.");
  }

  if (state === "sent") {
    return (
      <div className="mt-4 rounded-[10px] bg-card border border-hair p-3" role="status">
        <div className="text-[12.5px] font-semibold text-ink">Check your email</div>
        <p className="m-0 mt-1 text-[12.5px] leading-[1.6] text-mid-tone">
          A sign-in link is on its way to <b className="font-semibold text-ink">{email.trim()}</b>. It works once and lasts an hour. Nothing there? Look in spam, or{" "}
          <button type="button" onClick={() => setState("idle")} className="text-accent font-semibold cursor-pointer hover:underline">
            try another address
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={sendLink} className="mt-4 grid gap-2">
      <label className="sr-only" htmlFor="email">
        Email
      </label>
      <input id="email" type="email" required autoComplete="email" placeholder="you@example.com" className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className={primary} type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {apple && (
        <>
          <div className="flex items-center gap-3 text-[12px] text-dim my-1">
            <span className="flex-1 h-px bg-hair" />
            or
            <span className="flex-1 h-px bg-hair" />
          </div>
          <button className={quiet} type="button" onClick={signInWithApple}>
            Sign in with Apple
          </button>
        </>
      )}
      {error && (
        <p className="m-0 mt-1 text-[12.5px] text-loved" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
