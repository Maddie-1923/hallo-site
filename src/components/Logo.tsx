// The redrawn Kodigo mark from September 2026: a rounded k with three stripes
// — yellow, pink, blue — climbing out of its stem. Traced from the app's
// `KodigoLogoAnimation` artwork (the cut whose stripes end on rounded caps
// rather than running off the frame, which is the one that reads at nav
// size), in that image's 1024-pixel coordinates.
//
// Vector rather than the PNG so it stays sharp at any size, and so the k can
// take the page's ink: cream by night as in the app, graphite by day, where a
// cream k would disappear into a Bone page. The stripes keep their own colours
// in both.
//
// The k is three thick strokes with round caps: the stem, and two arms at 45°
// through the round ends top right and bottom right. The stripes run on under
// it, so the notch where the upper arm leaves the stem shows a sliver of blue,
// the same as the artwork.
const YELLOW = "#FFCB14";
const PINK = "#FF69C4";
const BLUE = "#38B6FF";

export function LogoMark({ size = 20, label }: { size?: number; label?: string }) {
  return (
    <svg
      viewBox="240 56 532 916"
      width={size}
      height={(size * 916) / 532}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      style={{ display: "block" }}
    >
      <defs>
        {/* The soft shadow each stripe casts on the one behind it. */}
        <linearGradient id="kodigo-stripe-shade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".22" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="338" y="65" width="137" height="560" rx="68.5" fill={BLUE} />
      <rect x="432" y="118" width="14" height="507" fill="url(#kodigo-stripe-shade)" />
      <rect x="295" y="65" width="137" height="560" rx="68.5" fill={PINK} />
      <rect x="385" y="118" width="14" height="507" fill="url(#kodigo-stripe-shade)" />
      <rect x="248" y="65" width="137" height="560" rx="68.5" fill={YELLOW} />
      <g stroke="var(--ink)" strokeWidth="226" strokeLinecap="round" fill="none">
        <path d="M361 568V852" />
        <path d="M640 568L361 847" />
        <path d="M648 852L361 565" />
      </g>
    </svg>
  );
}
