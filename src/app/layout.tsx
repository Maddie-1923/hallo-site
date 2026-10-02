import type { Metadata } from "next";
import localFont from "next/font/local";
import { Unbounded } from "next/font/google";
import "./globals.css";
import { prePaintScript } from "@/lib/theme";

// Self-hosted rather than next/font/google. Open Runde is the app's own face
// (the files come from the Kodigo repo's OpenRunde-1.0.1/web), so the site
// reads as the same product; Bebas Neue is the display face the landing page
// was designed with. Both are OFL.
const bebas = localFont({
  src: "../fonts/BebasNeue-Regular.woff2",
  weight: "400",
  variable: "--font-bebas",
  display: "swap",
});
const runde = localFont({
  src: [
    { path: "../fonts/OpenRunde-Regular.woff2", weight: "400" },
    { path: "../fonts/OpenRunde-Semibold.woff2", weight: "600" },
    { path: "../fonts/OpenRunde-Bold.woff2", weight: "700" },
  ],
  variable: "--font-runde",
  display: "swap",
});

// The wide, heavy face for the billboard's taglines, the reference's
// "DON'T COME WITH HIM!" line. next/font downloads it at build time and
// serves it from this site, so no request goes to Google from a visitor.
const wide = Unbounded({ weight: ["700", "800"], subsets: ["latin"], variable: "--font-wide", display: "swap" });

export const metadata: Metadata = {
  title: "Kodigo — Track your shows and movies",
  description:
    "A fast, private tracker for TV and film. Your library lives on your device, and a Kodigo account keeps it in step across devices when you want that.",
  openGraph: {
    title: "Kodigo",
    description: "A fast, private tracker for TV and film.",
  },
  // How AdSense confirms the site is ours (its "Meta tag" option), on every
  // page and without loading its script: ads themselves still wait for each
  // placement's slot id (lib/ads.ts).
  ...(process.env.NEXT_PUBLIC_ADSENSE_CLIENT && { other: { "google-adsense-account": process.env.NEXT_PUBLIC_ADSENSE_CLIENT } }),
};

export const viewport = { themeColor: "#17191c" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bebas.variable} ${runde.variable} ${wide.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Runs before first paint so a Day person never sees a Night flash. */}
        <script dangerouslySetInnerHTML={{ __html: prePaintScript }} />
      </head>
      <body className="min-h-full flex flex-col relative">{children}</body>
    </html>
  );
}
