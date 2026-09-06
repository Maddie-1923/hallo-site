"use client";

import { useState } from "react";
import { TightHeart } from "./marks";

// Ten hearts in half steps, the app's scale. A mouse can point at half a
// heart, so the left half of each one previews and sets the half score and
// the right half the whole — the app's tap-again toggle isn't needed here. A
// half heart is the dim outline with the lit heart clipped to its left half
// on top, the same way the app builds it from two symbols. The hearts are
// `TightHeart`, cropped to their bounds so the row sits as tight as
// Letterboxd's stars.
export function HeartRating({
  value,
  onChange,
  label,
  size = 18,
  disabled,
  className = "",
}: {
  value: number | null;
  onChange: (next: number) => void;
  label: string;
  /** Width of one heart in px; the slot is a pixel wider. */
  size?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const off = "color-mix(in srgb, var(--ink) 28%, transparent)";
  return (
    <div className={`flex justify-center ${className}`} onMouseLeave={() => setHover(null)} role="radiogroup" aria-label={label}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const score = hover ?? value ?? 0;
        const lit = score >= n - 0.5;
        const half = lit && score < n;
        const pointed = (e: React.MouseEvent<HTMLButtonElement>) => {
          const r = e.currentTarget.getBoundingClientRect();
          return e.clientX - r.left < r.width / 2 ? n - 0.5 : n;
        };
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value !== null && Math.ceil(value) === n}
            aria-label={`${n} out of 10`}
            onMouseMove={(e) => setHover(pointed(e))}
            disabled={disabled}
            onClick={(e) => onChange(pointed(e))}
            className="relative flex items-center justify-center cursor-pointer disabled:cursor-default"
            style={{ width: size + 1, height: size + 6, color: lit && !half ? "var(--loved)" : off }}
          >
            <TightHeart size={size} />
            {half && (
              <span aria-hidden className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--loved)", clipPath: "inset(0 50% 0 0)" }}>
                <TightHeart size={size} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
