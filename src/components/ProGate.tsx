import Link from "next/link";

// The Pro pages' (Calendar, Library) card for whoever can't use them yet,
// and the way past it.
// What stands between someone and the tracker, and the way past it.
export function ProGate({ why, page = "calendar" }: { why: "signin" | "pro" | "empty" | "closed"; page?: "calendar" | "library" | "stats" }) {
  const copy = {
    signin: ["Your tracker, on the web", "Everything you're watching, what's up next and what's coming, checked off on a computer and in step with the app. Sign in to open it.", `/login?next=/${page}`, "Sign in"],
    pro: ["The tracker is part of Kodigo Pro", "Up next, the calendar and checking off episodes on the web come with Pro, the same subscription as the app. Reading, rating and reviewing stay free.", "/pro", "See Kodigo Pro"],
    empty: ["Nothing to track yet", "Add a series or a film from its page, or bring your library over from the app or a backup, and it shows here.", "/settings#data", "Import a library"],
    closed: ["Your tracker, on the web", "Everything you're watching, what's up next and what's coming, checked off on a computer and in step with the app. It opens with accounts, as part of Kodigo Pro.", "/pro", "See Kodigo Pro"],
  }[why];
  return (
    <div className="max-w-[640px] rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]">
      <div className="rounded-shell bg-piece p-4 grid gap-3">
        <h1 className="!text-[clamp(28px,3.4vw,40px)] !leading-[.95] uppercase">{copy[0]}</h1>
        <p className="m-0 text-[12.5px] leading-[1.6] text-mid-tone">{copy[1]}</p>
        <div>
          <Link href={copy[2]} className="inline-flex items-center h-10 px-5 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold no-underline">
            {copy[3]}
          </Link>
        </div>
      </div>
    </div>
  );
}
