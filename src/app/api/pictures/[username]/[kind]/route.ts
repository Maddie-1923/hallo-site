import { isPictureKind, readPicture } from "@/lib/picture-store";

// A member's photo or banner as the app and the site share it (lib/
// picture-store.ts reads it).
//
// Pages link here with the change time in the address (`?v=`, lib/
// pictures.ts), so a matching request is cached for a year: a new picture
// is a new address. Anything else (an old address, none at all) is cached
// briefly.

const missing = () => new Response("No picture.", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

export async function GET(req: Request, { params }: { params: Promise<{ username: string; kind: string }> }) {
  const { username, kind } = await params;
  if (!isPictureKind(kind)) return missing();
  if (!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) return new Response("Not configured.", { status: 503 });
  const pic = await readPicture(username, kind);
  if (!pic) return missing();
  const { bytes } = pic;

  const asked = new URL(req.url).searchParams.get("v");
  const changed = pic.changed ? Date.parse(pic.changed) : NaN;
  const current = asked !== null && Number.isFinite(changed) && asked === changed.toString(36);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(bytes.length),
      "Cache-Control": current ? "public, max-age=31536000, immutable" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
