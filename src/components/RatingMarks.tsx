import { TightHeart } from "./marks";

// How a rating out of ten is drawn on the profile: the app's ten hearts, or
// ten stars to see whether stars read better. Either way one mark a point,
// half a mark for a half point. One switch, so trying one against the other
// is a one-word change.
const SHAPE: "hearts" | "stars" = "stars";

// `rows` of 2 sets the ten marks as two rows of five, so each can be drawn
// larger in a narrow column.
export function RatingMarks({ value, size = 10, rows = 1 }: { value: number; size?: number; rows?: 1 | 2 }) {
  const glyph = SHAPE === "stars" ? <Star size={size * 1.15} /> : <TightHeart size={size} />;
  return (
    <span className={rows === 2 ? "inline-grid grid-cols-5 gap-x-[1px] gap-y-[1px]" : "inline-flex items-center gap-[1px]"} title={`${value} out of 10`}>
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
  );
}

function Star({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="block shrink-0">
      <path fill="currentColor" d="M12 2.2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.1l-6.1 3.5 1.5-6.8-5.2-4.6 6.9-.7z" />
    </svg>
  );
}
