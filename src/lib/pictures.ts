import "server-only";
import { image } from "@/lib/tmdb";

// Where a member's photo and banner come from, for every page that draws
// them. First the pictures the app and the site share (finished crops in
// the library archive, served by app/api/pictures; the profile row says
// whether there is one and when it changed, supabase/migrations/
// 20261002110000_profile_pictures.sql), then the TMDB artwork the site
// used to save on the profile row, then nothing (the page's own fallback:
// the initial, or a favourite's still).

/** The profile columns the addresses are built from. */
export const PICTURE_COLUMNS = "username, avatar_path, banner_path, has_avatar, has_banner, picture_changed";

export interface PictureRow {
  username: string | null;
  avatar_path?: string | null;
  banner_path?: string | null;
  has_avatar?: boolean | null;
  has_banner?: boolean | null;
  picture_changed?: string | null;
}

/** The change time as a short version for the address, so a new picture is
    a new address and an old one can be cached for good. */
function version(changed: string | null | undefined) {
  const t = changed ? Date.parse(changed) : NaN;
  return Number.isFinite(t) ? `?v=${t.toString(36)}` : "";
}

const shared = (p: PictureRow, kind: "avatar" | "banner") => `/api/pictures/${encodeURIComponent(p.username!)}/${kind}${version(p.picture_changed)}`;

export function avatarUrl(p: PictureRow): string | null {
  if (p.username && p.has_avatar) return shared(p, "avatar");
  return image.poster(p.avatar_path, "w342");
}

export function bannerUrl(p: PictureRow): string | null {
  if (p.username && p.has_banner) return shared(p, "banner");
  return image.backdrop(p.banner_path);
}
