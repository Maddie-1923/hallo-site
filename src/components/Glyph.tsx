/** The app's key glyphs, drawn to match its SF Symbols (licensed for Apple
    platforms only). */
export function Glyph({ name, size = 18 }: { name: "ellipsis" | "plus" | "repeat" | "heart" | "heart-fill" | "check-circle" | "check" | "pause" | "bell" | "bookmark" | "list" | "share" | "skip" | "recap"; size?: number }) {
  const s = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  switch (name) {
    case "ellipsis":
      return (
        <svg {...s} fill="currentColor">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      );
    case "plus":
      return (
        <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "repeat":
      return (
        <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M8 10.5a4.5 4.5 0 0 1 7.6-2.3M16 13.5a4.5 4.5 0 0 1-7.6 2.3M15.8 5.8v2.6h-2.6M8.2 18.2v-2.6h2.6" />
        </svg>
      );
    case "heart":
    case "heart-fill":
      return (
        <svg {...s} fill={name === "heart-fill" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
          <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
        </svg>
      );
    case "check-circle":
      return (
        <svg {...s} fill="currentColor">
          <circle cx="12" cy="12" r="10" />
          <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="var(--card)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "check":
      return (
        <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 12.5l5 5L19.5 7" />
        </svg>
      );
    case "pause":
      return (
        <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M9 5.5v13M15 5.5v13" />
        </svg>
      );
    case "bell":
      return (
        <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
          <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
          <path d="M10 20.5a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
      );
    case "skip":
      return (
        <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
          <path d="M5 5.5v13l10-6.5z" />
          <path d="M18.5 5.5v13" strokeLinecap="round" />
        </svg>
      );
    case "recap":
      return (
        <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17h-9l-4.5 3.5V17H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 5z" />
          <path d="M6.5 10h4M13 10h4.5M6.5 13h7M15.5 13h2" />
        </svg>
      );
    case "list":
      return (
        <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M9 6.5h11M9 12h11M9 17.5h11" />
          <circle cx="4.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="17.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "share":
      return (
        <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5M16 7l-4-4-4 4M12 3v12" />
        </svg>
      );
    case "bookmark":
      return (
        <svg {...s} fill="currentColor">
          <path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z" />
        </svg>
      );
  }
}
