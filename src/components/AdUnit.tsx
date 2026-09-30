"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

// The AdSense unit itself: Google's tag (loaded once, only on pages that
// have an ad, so pages without one set no ad cookies), and the unit, asked
// for when it mounts. A wide banner that fits the height AdSlot keeps for it.
export function AdUnit({ client, slot }: { client: string; slot: string }) {
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);
  return (
    <>
      <Script id="adsbygoogle" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`} strategy="afterInteractive" crossOrigin="anonymous" />
      <ins className="adsbygoogle" style={{ display: "block", width: "100%", height: "100%" }} data-ad-client={client} data-ad-slot={slot} data-ad-format="horizontal" data-full-width-responsive="false" />
    </>
  );
}
