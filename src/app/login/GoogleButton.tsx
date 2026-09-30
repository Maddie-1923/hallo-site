"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Continue with Google, as Google's own button (Google Identity Services).
// Google signs the person in on this page and hands back a signed ID token,
// which Supabase checks (signInWithIdToken); nobody is sent to the
// supabase.co address, so Google's window names this site. The button is
// drawn by Google, as its rules ask, in its closest match to ours: white,
// outlined, rounded, full width. A nonce ties the token to this one attempt.

type Google = {
  accounts: {
    id: {
      initialize(options: Record<string, unknown>): void;
      renderButton(el: HTMLElement, options: Record<string, unknown>): void;
    };
  };
};
declare global {
  interface Window {
    google?: Google;
  }
}

const SCRIPT = "https://accounts.google.com/gsi/client";

function loadScript(): Promise<Google> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  return new Promise((resolve, reject) => {
    let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    if (!s) {
      s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => (window.google ? resolve(window.google) : reject(new Error("no google"))));
    s.addEventListener("error", () => reject(new Error("blocked")));
  });
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Its height is Google's to choose and differs by browser and screen, so
// once it's drawn it's measured and reported (onHeight), and the buttons
// beside it take the same height.
export function GoogleButton({ clientID, onSignedIn, onError, onHeight }: { clientID: string; onSignedIn: () => void; onError: (message: string) => void; onHeight?: (px: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const google = await loadScript();
        const raw = crypto.randomUUID() + crypto.randomUUID();
        const hashed = await sha256(raw);
        if (!live || !box.current) return;
        google.accounts.id.initialize({
          client_id: clientID,
          nonce: hashed,
          ux_mode: "popup",
          callback: async ({ credential }: { credential: string }) => {
            const { error } = await createClient().auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
            if (error) onError("Google sign-in didn't finish. Try again, or use your email.");
            else onSignedIn();
          },
        });
        google.accounts.id.renderButton(box.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
          width: Math.min(400, box.current.offsetWidth || 320),
        });
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [clientID, onError, onSignedIn]);

  useEffect(() => {
    const el = box.current;
    if (!el || !onHeight) return;
    // The box holds Google's button and nothing else, so once Google has
    // drawn into it the box's own height is the button's.
    const report = () => {
      if (!el.querySelector("iframe, div")) return;
      const h = el.getBoundingClientRect().height;
      if (h > 24) onHeight(Math.round(h));
    };
    const watch = new ResizeObserver(report);
    watch.observe(el);
    const mutations = new MutationObserver(() => {
      const frame = el.querySelector("iframe");
      if (frame) watch.observe(frame);
      report();
    });
    mutations.observe(el, { childList: true, subtree: true, attributes: true });
    return () => {
      watch.disconnect();
      mutations.disconnect();
    };
  }, [onHeight]);

  // A blocker that stops Google's script leaves the email way in, said so.
  if (failed) return <p className="m-0 text-[12.5px] text-dim text-center">Google sign-in couldn&apos;t load here. Use your email below.</p>;
  return <div ref={box} className="w-full flex justify-center items-start [color-scheme:light]" />;
}
