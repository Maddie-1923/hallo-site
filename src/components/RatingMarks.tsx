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
  // A plain filled star drawn on whole pixels, without the soft outline it
  // used to wear, so it stays crisp at the small sizes it's used at.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="block shrink-0" shapeRendering="geometricPrecision">
      <path fill="currentColor" d="M12 1.8l3.1 6.5 7.1.9-5.2 4.9 1.3 7.1L12 17.8l-6.3 3.4 1.3-7.1-5.2-4.9 7.1-.9z" />
    </svg>
  );
}
