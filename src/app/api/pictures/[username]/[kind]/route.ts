import { createClient as createAdminClient } from "@supabase/supabase-js";

// A member's photo or banner as the app and the site share it: the finished
// JPEG crop in their library archive (`profileAvatar` / `profileBanner`).
// The archive is private, so it's read with the service key, and only the
// one picture comes out of it. Only for a profile with a username that
// isn't suspended, the same members whose profile row anyone may read.
//
// Pages link here with the change time in the address (`?v=`, lib/
// pictures.ts), so a matching request is cached for a year: a new picture
// is a new address. Anything else (an old address, none at all) is cached
// briefly.

const KEYS = { avatar: "profileAvatar", banner: "profileBanner" } as const;
const NAME = /^[a-z0-9_.]{1,40}$/;

const missing = () => new Response("No picture.", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

export async function GET(req: Request, { params }: { params: Promise<{ username: string; kind: string }> }) {
  const { username, kind } = await params;
  const name = username.toLowerCase();
  if (!Object.hasOwn(KEYS, kind) || !NAME.test(name)) return missing();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!key) return new Response("Not configured.", { status: 503 });
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: p } = await db.from("profiles").select("user_id, suspended_at, picture_changed").eq("username", name).maybeSingle();
  if (!p || p.suspended_at) return missing();
  const { data: row } = await db.from("libraries").select(`picture:archive->>${KEYS[kind as keyof typeof KEYS]}`).eq("user_id", p.user_id).maybeSingle();
  const b64 = (row as { picture?: string | null } | null)?.picture;
  if (!b64) return missing();
  const bytes = Buffer.from(b64, "base64");
  // JPEG only: what the app and the site save. Anything else isn't served.
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return missing();

  const asked = new URL(req.url).searchParams.get("v");
  const changed = p.picture_changed ? Date.parse(p.picture_changed) : NaN;
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
