import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { previewArchive } from "@/lib/profile-previews";
import { yearReview } from "@/lib/year-review";

// The picture a shared Year in Review unfolds into in a chat: the year, big,
// over the picture of what they watched most, the four numbers under it, the
// top three posters on the right, and the Kodigo mark. Night colours, as the
// review's picture, since a chat can't ask.
export const alt = "A year in review on Kodigo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BONE = "#e6e0d6";
const DIM = "#b9b4ab";
const fonts = join(process.cwd(), "src/fonts/og");

export default async function Image({ params }: { params: Promise<{ username: string; year: string }> }) {
  const { username, year } = await params;
  const archive = username === "preview" ? await previewArchive() : null;
  const r = archive ? yearReview(archive, Number(year)) : null;
  const [bebas, runde, rundeSemi] = await Promise.all([readFile(join(fonts, "BebasNeue-Regular.ttf")), readFile(join(fonts, "OpenRunde-Regular.otf")), readFile(join(fonts, "OpenRunde-Semibold.otf"))]);
  // The first of their top titles that has a wide picture.
  const hero = [...(r?.topShows ?? []), ...(r?.topFilms ?? [])].find((t) => t.backdrop)?.backdrop ?? null;
  const posters = [...(r?.topShows ?? []), ...(r?.topFilms ?? [])].filter((t) => t.poster).slice(0, 3);
  const numbers: [string, string][] = r
    ? [
        [r.hours.toLocaleString("en"), "hours"],
        [r.episodes.toLocaleString("en"), "episodes"],
        [r.films.toLocaleString("en"), "films"],
        [r.shows.toLocaleString("en"), "series"],
      ]
    : [];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#1c1c1b", fontFamily: "Runde", color: BONE }}>
        {hero && <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: 1200, height: 630, backgroundImage: `url(${hero.replace("/original/", "/w1280/")})`, backgroundSize: "1200px 675px", backgroundPosition: "0px -20px" }} />}
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: 1200, height: 630, background: "linear-gradient(90deg, rgba(18,18,17,.94) 0%, rgba(18,18,17,.82) 45%, rgba(18,18,17,.35) 100%)" }} />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", padding: "52px 56px", width: 760 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: DIM }}>@{username} · Year in review</div>
            <div style={{ display: "flex", fontFamily: "Bebas", fontSize: 250, lineHeight: 0.82, marginTop: 18 }}>{year}</div>
          </div>
          <div style={{ display: "flex", gap: 40 }}>
            {numbers.map(([n, label]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontFamily: "Bebas", fontSize: 76, lineHeight: 0.9 }}>{n}</span>
                <span style={{ fontSize: 24, color: DIM }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", position: "absolute", right: 56, top: 60, gap: 14 }}>
          {posters.map((t, i) => (
            <div key={t.key} style={{ display: "flex", width: 118, height: 177, borderRadius: 14, overflow: "hidden", border: "2px solid rgba(255,255,255,.25)", marginTop: i * 40 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.poster!.replace("/w780/", "/w342/")} width={118} height={177} alt="" style={{ objectFit: "cover" }} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", position: "absolute", right: 56, bottom: 48 }}>
          <Mark />
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

// The Kodigo mark (components/Logo.tsx), in the night ink.
function Mark() {
  return (
    <svg width={48} height={(48 * 916) / 532} viewBox="240 56 532 916">
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
