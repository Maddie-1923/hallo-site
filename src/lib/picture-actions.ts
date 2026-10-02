"use server";

import { revalidatePath } from "next/cache";
import { withArchive } from "@/lib/archive-write";
import { createClient } from "@/lib/supabase/server";
import { image, titleArtwork, type ArtCandidate } from "@/lib/tmdb";

// The owner's photo and banner, kept where the app keeps them: the finished
// crop as a JPEG in the library archive (`profileAvatar`, `profileBanner`),
// with `profilePicturesChanged` moved, so the phone takes the pair on its
// next sync and the newer side wins (kodigo/ProfilePictures.swift). The
// browser does the cropping (components/ProfilePictures.tsx) at the app's
// sizes; this checks what arrives is that and nothing else.

export type PictureTarget = "avatar" | "banner";

const SPEC = {
  // The app's sizes: 600 square for the photo, 1600 across for the banner,
  // 393 by 170 (ProfilePictures.swift, PhotoEditing.swift).
  avatar: { key: "profileAvatar", longest: 600, aspect: 1, maxBytes: 400 * 1024 },
  banner: { key: "profileBanner", longest: 1600, aspect: 393 / 170, maxBytes: 1536 * 1024 },
} as const;

/** A JPEG's width and height from its frame header, or null if it isn't one. */
function jpegSize(b: Buffer): { width: number; height: number } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    // Padding before a marker, and the markers that carry no length.
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = b.readUInt16BE(i + 2);
    // Any start-of-frame (C0–CF but for C4, C8 and CC, which are tables).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    if (marker === 0xda || length < 2) return null;
    i += 2 + length;
  }
  return null;
}

/** Saves a finished crop (base64 JPEG) as the photo or banner, or removes
    it (null): the initial for the photo, the latest watch for the banner. */
export async function savePicture(target: PictureTarget, jpeg: string | null): Promise<{ error?: string }> {
  if (target !== "avatar" && target !== "banner") return { error: "That isn't a picture you can change." };
  const spec = SPEC[target];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  let data: string | null = null;
  if (jpeg !== null) {
    if (typeof jpeg !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(jpeg)) return { error: "That picture couldn't be read. Try another." };
    const bytes = Buffer.from(jpeg, "base64");
    if (bytes.length > spec.maxBytes) return { error: "That picture is too big. Try another." };
    const size = jpegSize(bytes);
    if (!size) return { error: "That picture couldn't be read. Try another." };
    const { width, height } = size;
    // A little either way for rounding; anything else didn't come from the crop.
    const fits = Math.max(width, height) <= spec.longest && Math.min(width, height) >= 16 && Math.abs(width - height * spec.aspect) <= Math.max(2, height * spec.aspect * 0.01);
    if (!fits) return { error: "That picture isn't the right shape. Crop it again." };
    // Kept as Swift writes `Data`: plain base64.
    data = bytes.toString("base64");
  }

  const r = await withArchive((a, stamp) => {
    // Only this one picture changes; the other rides along under the new
    // stamp, since the pair always moves together.
    a[spec.key] = data;
    a.profilePicturesChanged = stamp;
  });
  if (r.error) return r;

  // The TMDB artwork the site used to keep on the profile row would show
  // through after a removal, and a new picture should win outright, so it
  // goes either way.
  await supabase.from("profiles").update(target === "avatar" ? { avatar_path: null } : { banner_path: null }).eq("user_id", user.id);
  revalidatePath("/", "layout");
  return {};
}

export interface ArtChoice {
  /** A small copy for the grid, and the large one the crop works from. */
  thumb: string;
  full: string;
}

/** One title's artwork to choose from, ordered as the app orders it:
    posters with no text on them for the photo, backdrops for the banner
    (textless first). */
export async function profileArtwork(kind: "show" | "movie", id: number, target: PictureTarget): Promise<{ choices?: ArtChoice[]; error?: string }> {
  if ((kind !== "show" && kind !== "movie") || !Number.isInteger(id) || id <= 0) return { error: "That isn't a title." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const art = await titleArtwork(kind, id);
  if (!art) return { error: "Couldn't load the artwork. Try again." };
  // Highest score first, the vote count breaking ties (TMDB.Artwork.candidates).
  const byScore = (x: ArtCandidate, y: ArtCandidate) => (y.vote_average ?? 0) - (x.vote_average ?? 0) || (y.vote_count ?? 0) - (x.vote_count ?? 0);
  const picked =
    target === "avatar"
      ? art.posters.filter((p) => p.iso_639_1 === null).sort(byScore)
      : [...art.backdrops.filter((b) => b.iso_639_1 === null).sort(byScore), ...art.backdrops.filter((b) => b.iso_639_1 !== null).sort(byScore)];
  // The poster at `original` and the backdrop at w1280, as the app fetches
  // them for its crop: a face zoomed to fill the circle needs the pixels.
  return {
    choices: picked.map((p) =>
      target === "avatar" ? { thumb: image.poster(p.file_path, "w342")!, full: image.poster(p.file_path, "original")! } : { thumb: image.poster(p.file_path, "w780")!, full: image.poster(p.file_path, "w1280")! },
    ),
  };
}
