import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { loadProfile } from "@/lib/profile-previews";
import { reviewFor } from "@/lib/public-profile";

// The picture a shared review's link unfolds into in iMessage, WhatsApp, X
// and the rest: the review sheet redrawn at link-preview size. The still in
// its shell across the top, then who watched it, the title and year, the
// stars, and the review's opening lines, with the Kodigo mark in the corner.
// A spoiler review shows "Contains spoilers" and none of its words.
//
// Drawn in the night colours whatever the reader's setting, since a chat
// can't ask. The stars are Honey's night tone for now; once accounts keep
// their theme they can take the reviewer's.
export const alt = "A review on Kodigo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CARD = "#30302e";
const HAIR = "#42423f";
const BONE = "#e6e0d6";
const DIM = "#918e88";
const STAR = "#D9BC52";
const LOVED = "#ff5a6e";

const fonts = join(process.cwd(), "src/fonts/og");

export default async function Image({ params }: { params: Promise<{ username: string; key: string }> }) {
  const { username, key } = await params;
  const view = await loadProfile(username);
  const r = view && reviewFor(view, key);
  const [bebas, runde, rundeSemi] = await Promise.all([readFile(join(fonts, "BebasNeue-Regular.ttf")), readFile(join(fonts, "OpenRunde-Regular.otf")), readFile(join(fonts, "OpenRunde-Semibold.otf"))]);
  const still = r ? (r.backdrop ?? r.poster) : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: CARD, padding: 24, fontFamily: "Runde", color: BONE }}>
        <div style={{ display: "flex", width: "100%", height: 318, borderRadius: 24, overflow: "hidden", border: `2px solid ${HAIR}`, background: "#383836" }}>
          {/* A background rather than an <img>, so the crop can favour the
              upper part of the still, where the faces usually are. */}
          {still && <div style={{ display: "flex", width: "100%", height: "100%", backgroundImage: `url(${still.replace("/w780/", "/w1280/")})`, backgroundSize: "1152px 648px", backgroundPosition: "0px -110px" }} />}
        </div>

        <div style={{ display: "flex", flex: 1, padding: "20px 12px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", fontSize: 24, color: DIM }}>
              <span style={{ color: BONE, fontWeight: 600, marginRight: 8 }}>@{username}</span>
              {r?.rewatch ? "rewatched" : "watched"}
              {r?.episodes && <span style={{ color: BONE, fontWeight: 600, marginLeft: 8 }}>{r.episodes}</span>}
              {r?.episodes && <span style={{ marginLeft: 8 }}>of</span>}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 4, fontFamily: "Bebas", lineHeight: 1 }}>
              <span style={{ fontSize: 66, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 900 }}>{r?.title ?? "A review on Kodigo"}</span>
              {r?.year && <span style={{ fontSize: 40, color: DIM, marginLeft: 14 }}>{r.year}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
              {r?.rating != null && <Stars value={r.rating} />}
              {r?.loved && <span style={{ color: LOVED, fontSize: 28, marginLeft: 14 }}>♥</span>}
            </div>
            {r &&
              (r.spoilers ? (
                <div style={{ display: "flex", marginTop: 14 }}>
                  <span style={{ padding: "4px 14px", borderRadius: 999, border: `2px solid ${HAIR}`, background: "#383836", fontSize: 20, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: DIM }}>Contains spoilers</span>
                </div>
              ) : (
                <div style={{ display: "block", marginTop: 12, fontSize: 25, lineHeight: 1.45, lineClamp: 2, maxWidth: 1000 }}>{r.text.replace(/\s*\n\s*/g, " ")}</div>
              ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", marginLeft: 24 }}>
            <Mark />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bebas", data: bebas, weight: 400, style: "normal" },
        { name: "Runde", data: runde, weight: 400, style: "normal" },
        { name: "Runde", data: rundeSemi, weight: 600, style: "normal" },
      ],
    },
  );
}

// Ten stars in a row, half steps drawn as half a star over an empty one.
function Stars({ value }: { value: number }) {
  const S = 30;
  const star = (color: string) => (
    <svg width={S} height={S} viewBox="0 0 24 24">
      <path d="M12 2.2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.1l-6.1 3.5 1.5-6.8-5.2-4.6 6.9-.7z" fill={color} stroke={color} strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
  return (
    <div style={{ display: "flex" }}>
      {Array.from({ length: 10 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <div key={i} style={{ display: "flex", position: "relative", width: S, height: S, marginRight: 4 }}>
            {star("#4a4a47")}
            {fill > 0 && <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: S * fill, height: S, overflow: "hidden" }}>{star(STAR)}</div>}
          </div>
        );
      })}
    </div>
  );
}

// The Kodigo mark (components/Logo.tsx), in the night ink.
function Mark() {
  return (
    <svg width={52} height={(52 * 916) / 532} viewBox="240 56 532 916">
      <rect x="338" y="65" width="137" height="560" rx="68.5" fill="#38B6FF" />
      <rect x="295" y="65" width="137" height="560" rx="68.5" fill="#FF69C4" />
      <rect x="248" y="65" width="137" height="560" rx="68.5" fill="#FFCB14" />
      <g stroke={BONE} strokeWidth="226" strokeLinecap="round" fill="none">
        <path d="M361 568V852" />
        <path d="M640 568L361 847" />
        <path d="M648 852L361 565" />
      </g>
    </svg>
  );
}
