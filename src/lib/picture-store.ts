import "server-only";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Reading a member's photo or banner out of their library archive: the
// finished JPEG crop the app and the site share (`profileAvatar` /
// `profileBanner`). Served at /api/pictures, and read directly by the share
// cards, which can't fetch the site's own address on a protected preview.
// Only for a profile with a username that isn't suspended, the same members
// whose profile row anyone may read.

const KEYS = { avatar: "profileAvatar", banner: "profileBanner" } as const;
export type PictureKind = keyof typeof KEYS;
const NAME = /^[a-z0-9_.]{1,40}$/;

export function isPictureKind(kind: string): kind is PictureKind {
  return Object.hasOwn(KEYS, kind);
}

/** The JPEG and when the pair last changed, or null when there's none to give. */
export async function readPicture(username: string, kind: PictureKind): Promise<{ bytes: Buffer; changed: string | null } | null> {
  const name = username.toLowerCase();
  if (!NAME.test(name)) return null;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: p } = await db.from("profiles").select("user_id, suspended_at, picture_changed").eq("username", name).maybeSingle();
  if (!p || p.suspended_at) return null;
  const { data: row } = await db.from("libraries").select(`picture:archive->>${KEYS[kind]}`).eq("user_id", p.user_id).maybeSingle();
  const b64 = (row as { picture?: string | null } | null)?.picture;
  if (!b64) return null;
  const bytes = Buffer.from(b64, "base64");
  // JPEG only: what the app and the site save. Anything else isn't served.
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
  return { bytes, changed: p.picture_changed };
}
