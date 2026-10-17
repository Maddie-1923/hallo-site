// The three things the front door shows off under the poster wall (Laura,
// 17 Oct 2026, after Apple TV's page): Explore, tracking, and the widgets.
// Each is one big statement, a line under it, and the real thing in a frame
// — the website's own poster row where it can be live, screenshots of the
// apps where it can't. Dark like the wall above, whatever the theme.
//
// A screenshot that hasn't been made yet draws a labelled placeholder in its
// frame, so the layout can be judged before the pictures exist. Drop the file
// in public/landing/ under the name the frame asks for and it appears.

import { existsSync } from "node:fs";
import path from "node:path";

/** Whether a picture is in public/landing/ yet. Read at render, on the server. */
function has(file: string) {
  return existsSync(path.join(process.cwd(), "public", "landing", file));
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-4 text-center bg-[repeating-linear-gradient(135deg,#1b1d21_0_12px,#202327_12px_24px)]">
      <span className="whitespace-pre-line text-[13px] leading-snug text-white/45 font-semibold">{label}</span>
    </div>
  );
}

/** A phone, drawn rather than photographed, holding a screenshot or a
    screen drawn in HTML (`children`). */
export function PhoneFrame({ file, label, className = "", children }: { file?: string; label: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`relative aspect-[9/19.5] rounded-[clamp(26px,3vw,44px)] p-[clamp(6px,0.6vw,9px)] bg-[#2a2d32] border border-white/15 shadow-[0_30px_60px_rgba(0,0,0,.55)] ${className}`}>
      <div className="relative w-full h-full rounded-[clamp(20px,2.4vw,36px)] overflow-hidden bg-black">
        {children ? (
          <div role="img" aria-label={label} className="absolute inset-0">
            {children}
          </div>
        ) : file && has(file) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/landing/${file}`} alt={label} loading="lazy" className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <Placeholder label={`${label}\npublic/landing/${file}`} />
        )}
      </div>
    </div>
  );
}

/** A browser window around a part of the website, in the night colours
    whatever the theme, since the band around it is dark. */
export function BrowserFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`scheme-dark rounded-[16px] overflow-hidden bg-[#17191c] border border-white/15 shadow-[0_30px_60px_rgba(0,0,0,.5)] ${className}`}>
      <div className="flex items-center gap-2 h-9 px-3.5 bg-[#202327] border-b border-white/10">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 flex-1 max-w-[260px] h-5 rounded-md bg-white/8 text-[11px] leading-5 text-white/45 px-2 truncate">kodigo.pro</span>
      </div>
      {children}
    </div>
  );
}

/** A screenshot of the website inside a browser frame, or its placeholder. */
export function WebShot({ file, label }: { file: string; label: string }) {
  return (
    <BrowserFrame>
      <div className="relative aspect-[16/10]">
        {has(file) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/landing/${file}`} alt={label} loading="lazy" className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <Placeholder label={`${label}\npublic/landing/${file}`} />
        )}
      </div>
    </BrowserFrame>
  );
}

/** One showcase: the eyebrow in a stripe colour, the statement, the line, then the frames. */
export function Showcase({ id, eyebrow, stripe, title, body, children }: { id?: string; eyebrow: string; stripe: string; title: React.ReactNode; body?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="bg-[#0b0c0e] text-white py-[clamp(56px,9vw,110px)] border-t border-white/10 first:border-t-0">
      <div className="px-[clamp(16px,3.2vw,64px)]">
        <div className="text-[clamp(13px,1vw,15px)] font-bold tracking-[.16em] uppercase" style={{ color: stripe }}>
          {eyebrow}
        </div>
        <h2 className="!text-[clamp(34px,4.6vw,72px)] !leading-[0.95] text-white !mt-3 !mb-0 max-w-[20ch]">{title}</h2>
        {body && <p className="text-[clamp(16px,1.4vw,21px)] text-white/75 mt-5 mb-0 max-w-[52ch] leading-relaxed">{body}</p>}
      </div>
      <div className="mt-[clamp(32px,4.5vw,64px)] px-[clamp(16px,3.2vw,64px)]">{children}</div>
    </section>
  );
}
