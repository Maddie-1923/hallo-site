import type { Metadata } from "next";
import localFont from "next/font/local";
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

export const metadata: Metadata = {
  title: "Kodigo — Track your shows and movies",
  description:
    "A fast, private tracker for TV and film. Your library lives on your device, and a Kodigo account keeps it in step across devices when you want that.",
  openGraph: {
    title: "Kodigo",
    description: "A fast, private tracker for TV and film.",
  },
};

export const viewport = { themeColor: "#1a1a19" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bebas.variable} ${runde.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Runs before first paint so a Day person never sees a Night flash. */}
        <script dangerouslySetInnerHTML={{ __html: prePaintScript }} />
      </head>
      <body className="min-h-full flex flex-col relative">{children}</body>
    </html>
  );
}
