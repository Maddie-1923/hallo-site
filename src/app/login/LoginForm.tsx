"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const input = "w-full h-10 px-4 rounded-full bg-card border border-hair text-[13px] text-ink placeholder:text-dim focus:outline-none focus:border-accent";
const primary = "w-full h-10 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-default";
// Each provider's button in its own colours, as their sign-in guidelines ask.
const BRAND: Record<Provider, { label: string; className: string; logo: React.ReactNode }> = {
  apple: { label: "Continue with Apple", className: "bg-black text-white border border-white/20", logo: <AppleLogo /> },
  google: { label: "Continue with Google", className: "bg-white text-[#1f1f1f] border border-[#747775]", logo: <GoogleLogo /> },
  facebook: { label: "Continue with Facebook", className: "bg-[#1877F2] text-white border border-[#1877F2]", logo: <FacebookLogo /> },
};
type Provider = "apple" | "google" | "facebook";

export function LoginForm({ next, initialError, providers = [] }: { next: string; initialError?: string; providers?: Provider[] }) {
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

  async function continueWith(provider: Provider) {
    setError(undefined);
    const { error } = await createClient().auth.signInWithOAuth({ provider, options: { redirectTo: callback() } });
    if (error) setError(`${BRAND[provider].label.replace("Continue with ", "")} sign-in didn't start. Try another way.`);
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
    <div className="mt-4 grid gap-2">
      {providers.map((p) => (
        <button key={p} type="button" onClick={() => continueWith(p)} className={`w-full h-10 rounded-full text-[12.5px] font-semibold cursor-pointer flex items-center justify-center gap-2.5 hover:brightness-95 ${BRAND[p].className}`}>
          {BRAND[p].logo}
          {BRAND[p].label}
        </button>
      ))}
      {providers.length > 0 && (
        <div className="flex items-center gap-3 text-[12px] text-dim my-1">
          <span className="flex-1 h-px bg-hair" />
          or with your email
          <span className="flex-1 h-px bg-hair" />
        </div>
      )}
      <form onSubmit={sendLink} className="grid gap-2">
        <label className="sr-only" htmlFor="email">
          Email
        </label>
        <input id="email" type="email" required autoComplete="email" placeholder="you@example.com" className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className={primary} type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
      {error && (
        <p className="m-0 mt-1 text-[12.5px] text-loved" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function AppleLogo() {
  return (
    <svg width="15" height="18" viewBox="0 0 814 1000" fill="currentColor" aria-hidden>
      <path d="M788 341c-6 4-107 61-107 188 0 147 129 199 133 200-1 3-21 71-68 141-43 62-87 123-155 123s-86-39-164-39c-77 0-104 41-167 41s-106-58-156-128C46 785 0 659 0 540c0-192 125-294 248-294 65 0 120 43 161 43 39 0 100-45 175-45 28 0 131 3 204 97zM554 159c31-37 53-88 53-139 0-7-1-14-2-20-51 2-111 34-147 76-28 32-55 83-55 135 0 8 1 15 2 18 3 1 9 2 14 2 45 0 103-31 135-72z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.9l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#fff" />
      <path fill="#1877F2" d="M16.7 15.5l.5-3.5h-3.4V9.8c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.2-2.7-.2c-2.8 0-4.6 1.7-4.6 4.7V12H7v3.5h3v8.4c.6.1 1.2.1 1.9.1s1.3 0 1.9-.1v-8.4h2.9z" />
    </svg>
  );
}
