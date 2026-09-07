// The two platform marks, drawn as paths so they take currentColor and sit on
// the same baseline as the button's text. Apple's own badge artwork is a fixed
// image with its own padding and wordmark, which would put "Download on the
// App Store" on the page twice at two different sizes.

export function AppleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.13 3.02-.86.99-2.28 1.76-3.42 1.67a3.6 3.6 0 0 1-.03-.42c0-1.1.5-2.25 1.2-3.02.86-.95 2.31-1.66 3.34-1.7.02.15.04.3.04.45zM20.5 17.02c-.53 1.22-.78 1.77-1.46 2.86-.95 1.51-2.29 3.4-3.95 3.41-1.47.02-1.85-.96-3.85-.95-2 .01-2.42.97-3.9.95-1.66-.01-2.93-1.71-3.88-3.22C.8 15.85.5 10.9 2.15 8.27c1.17-1.86 3.02-2.95 4.76-2.95 1.77 0 2.88 1 4.34 1 1.42 0 2.28-1 4.33-1 1.55 0 3.2.85 4.37 2.31-3.84 2.11-3.22 7.6.55 9.39z" />
    </svg>
  );
}

export function AndroidMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {/* Antennae */}
      <path d="M6.4 3.2a.6.6 0 0 1 .85-.1l1.9 1.52a7.6 7.6 0 0 1 5.7 0l1.9-1.52a.6.6 0 1 1 .75.94l-1.72 1.38A6.6 6.6 0 0 1 18.9 10.4H5.1a6.6 6.6 0 0 1 3.12-4.98L6.5 4.04a.6.6 0 0 1-.1-.84z" />
      {/* Eyes, cut out of the head above. */}
      <circle cx="8.9" cy="8" r=".85" fill="var(--page)" />
      <circle cx="15.1" cy="8" r=".85" fill="var(--page)" />
      {/* Body */}
      <rect x="5.1" y="11.5" width="13.8" height="8.2" rx="1.6" />
      {/* Arms */}
      <rect x="2.1" y="11.5" width="2.2" height="6" rx="1.1" />
      <rect x="19.7" y="11.5" width="2.2" height="6" rx="1.1" />
      {/* Legs */}
      <rect x="7.9" y="19" width="2.2" height="4" rx="1.1" />
      <rect x="13.9" y="19" width="2.2" height="4" rx="1.1" />
    </svg>
  );
}
