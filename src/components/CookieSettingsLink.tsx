"use client";

declare global {
  interface Window {
    googlefc?: { callbackQueue: unknown[]; showRevocationMessage: () => void };
  }
}

// The footer's "Privacy and cookie settings", while ads are on: reopens
// Google's consent message (AdSense → Privacy & messaging) so a visitor can
// change their answer. Where the message hasn't loaded (a page without ads,
// or outside the regions that get it), the privacy policy's Ads section.
export function CookieSettingsLink() {
  return (
    <a
      href="/privacy#ads"
      onClick={(e) => {
        const fc = window.googlefc;
        if (!fc) return;
        e.preventDefault();
        fc.callbackQueue.push({ CONSENT_DATA_READY: () => fc.showRevocationMessage() });
      }}
      className="hover:text-ink"
    >
      Privacy and cookie settings
    </a>
  );
}
