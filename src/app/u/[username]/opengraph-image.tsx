import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import { loadProfile } from "@/lib/real-profile";
import { cacheFor, GenericCard, originFrom, shareData, shareFonts, WideCard } from "@/lib/share-card";

// The picture a profile's link unfolds into in iMessage, WhatsApp, X,
// Discord and the rest: the photo and counts, the about card and numbers,
// and the Top 5 films and shows (lib/share-card.tsx draws it). A private
// profile shows only the photo, the name and "Private profile"; a username
// that isn't there (or is suspended) gets Kodigo's own card.
export const alt = "A member's profile on Kodigo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const view = await loadProfile(username);
  const fonts = await shareFonts();
  const options = { ...size, fonts, headers: { "Cache-Control": cacheFor(view) } };
  if (!view) return new ImageResponse(<GenericCard />, options);
  const d = await shareData(view, originFrom(await headers()), "wide");
  return new ImageResponse(<WideCard d={d} />, options);
}
