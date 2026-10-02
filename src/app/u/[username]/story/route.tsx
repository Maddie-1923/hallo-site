import { ImageResponse } from "next/og";
import { loadProfile } from "@/lib/real-profile";
import { cacheFor, originFrom, shareData, shareFonts, StoryCard } from "@/lib/share-card";

// A profile as a story picture (1080 × 1920) for Instagram and TikTok: the
// banner, the photo over its edge, the about card, the counts, the numbers
// and the Top 5 films and shows (lib/share-card.tsx draws it). The profile's
// ••• menu links here with ?download=1, which saves it as kodigo-<name>.png.
// The same people get nothing (a 404) as for the profile page, and a private
// profile shows only the photo, the name and "Private profile".
export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const view = await loadProfile(username);
  if (!view) return new Response("Not found.", { status: 404 });
  const url = new URL(req.url);
  const d = await shareData(view, originFrom(req.headers, url.origin), "story");
  return new ImageResponse(<StoryCard d={d} />, {
    width: 1080,
    height: 1920,
    fonts: await shareFonts(),
    headers: {
      "Cache-Control": cacheFor(view),
      ...(url.searchParams.has("download") && { "Content-Disposition": `attachment; filename="kodigo-${view.username}.png"` }),
    },
  });
}
