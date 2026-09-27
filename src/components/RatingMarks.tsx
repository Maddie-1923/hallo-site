import { TightHeart } from "./marks";

// How a rating out of ten is drawn on the profile: the app's ten hearts, or
// five stars (each worth two points) to see whether stars read better. One
// switch, so trying one against the other is a one-word change. The value is
// always the app's ten-point rating; only the drawing changes.
const SHAPE: "hearts" | "stars" = "stars";

export function RatingMarks({ value, size = 10 }: { value: number; size?: number }) {
  const stars = SHAPE === "stars";
  const count = stars ? 5 : 10;
  const scaled = stars ? value / 2 : value;
  const glyph = stars ? <Star size={size * 1.25} /> : <TightHeart size={size} />;
  return (
    <span className="inline-flex items-center gap-[2px]" title={`${value} out of 10`}>
      {Array.from({ length: count }, (_, i) => {
        // How much of this mark is lit: whole, part, or none. A star can be
        // partly lit (7/10 is three and a half stars, 9.5 is four and three
        // quarters); the lit part is the mark clipped to that width.
        const fill = Math.max(0, Math.min(1, scaled - i));
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
