// The Lists pages' shared pieces: the shell a section's cards sit in, the
// heading pill over it, and the chevron a heading wears when it opens a page
// of its own.
export const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";
export const H = "inline-flex items-center gap-2 h-[2.8333rem] px-4 rounded-full bg-piece ![font-family:var(--font-body)] !font-bold !text-[0.875rem] !leading-none !tracking-[.12em] uppercase text-ink";

export function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
