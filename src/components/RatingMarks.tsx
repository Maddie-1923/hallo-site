import { MarkTip } from "./MarkTip";

// How a rating out of ten is drawn: ten stars, one a point, half a star for
// a half point.

// `rows` of 2 sets the ten marks as two rows of five, so each can be drawn
// larger in a narrow column.
export function RatingMarks({ value, size = 10, rows = 1 }: { value: number; size?: number; rows?: 1 | 2 }) {
  const glyph = <Star size={size * 1.15} />;
  return (
    // Its caption is the site's own (MarkTip), on the same short delay as
    // every other caption, rather than the browser's slower title tooltip.
    <MarkTip label={`${value} out of 10`}>
    <span className={rows === 2 ? "inline-grid grid-cols-5 gap-x-[1px] gap-y-[1px]" : "inline-flex items-center gap-[1px]"} data-rating={value}>
      {Array.from({ length: 10 }, (_, i) => {
        // How much of this mark is lit: whole, half, or none; the lit part is
        // the mark clipped to that width.
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-flex">
            <span className="inline-flex text-ink/20">{glyph}</span>
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden text-accent" style={{ width: `${fill * 100}%` }}>
                {glyph}
              </span>
            )}
          </span>
        );
      })}
      <span className="sr-only">{value} out of 10</span>
    </span>
    </MarkTip>
  );
}

export function Star({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="block shrink-0">
      {/* The same star with a rounded outline in its own colour, which
          softens every point the way Apple's rounded star does. Drawn a
          touch smaller so the outline brings it back to the same size. */}
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
        transform="translate(12 12) scale(.9) translate(-12 -12)"
        d="M12 2.2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.1l-6.1 3.5 1.5-6.8-5.2-4.6 6.9-.7z"
      />
    </svg>
  );
}
