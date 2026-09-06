import Link from "next/link";
import type { Movie, Show } from "@/lib/archive";
import { poster, year } from "@/lib/archive";
import { RailScroller } from "./RailScroller";
import { MarkButtons, type MarkState } from "./MarkButtons";
import type { ListOption } from "@/lib/marks";

// The app's rail card: poster on top, and under it a panel that carries the
// title, the year and the "+" — tinted with the poster itself. The tint is a
// second copy of the poster, blurred hard and darkened, clipped to the panel,
// which gives each card its own colour without sampling pixels (the posters
// are cross-origin, so a canvas couldn't read them anyway).
function Card({
  href,
  posterPath,
  title,
  sub,
  action,
}: {
  href: string;
  posterPath: string | null | undefined;
  title: string;
  sub: string;
  action: React.ReactNode;
}) {
  const src = poster(posterPath);
  return (
    <Link
      href={href}
      // Hover is an outline, not a lift — the Letterboxd move. A 2px ring in the
      // ink colour with a soft glow, and the card stays where it is.
      className="block no-underline group rounded-2xl overflow-hidden bg-card border border-hair transition-[box-shadow,border-color] duration-150 hover:border-ink hover:shadow-[0_0_0_2px_var(--ink),0_10px_30px_rgba(0,0,0,.45)]"
    >
      <div className="aspect-[2/3] bg-card">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3 text-center text-xs text-dim">{title}</div>
        )}
      </div>
      <div className="relative overflow-hidden">
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-bottom scale-[2.5] blur-2xl opacity-80" />
        )}
        <div aria-hidden className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--page) 45%, transparent)" }} />
        {/* A fixed height so every card in a rail lines up; a long title
            truncates rather than growing the panel. The full title is on
            the tooltip and the title page. */}
        <div className="relative px-3 pt-2.5 pb-3 h-[92px] flex flex-col">
          <div className="text-[15px] font-semibold leading-tight text-ink truncate" title={title}>{title}</div>
          <div className="text-xs text-ink/70 mt-0.5">{sub}</div>
          <div className="mt-auto flex justify-end pt-2">{action}</div>
        </div>
      </div>
    </Link>
  );
}

const NONE: MarkState = { loved: false, watched: false, tracked: false, rating: null, listIDs: [] };

export function ShowCard({ show, sub, marks = NONE, lists = [] }: { show: Show; sub?: string; marks?: MarkState; lists?: ListOption[] }) {
  return (
    <Card
      href={`/show/${show.id}`}
      posterPath={show.poster_path}
      title={show.name}
      sub={sub ?? year(show.first_air_date)}
      action={<MarkButtons target={{ kind: "show", show }} state={marks} lists={lists} />}
    />
  );
}

export function MovieCard({ movie, sub, marks = NONE, lists = [] }: { movie: Movie; sub?: string; marks?: MarkState; lists?: ListOption[] }) {
  return (
    <Card
      href={`/movie/${movie.id}`}
      posterPath={movie.poster_path}
      title={movie.title}
      sub={sub ?? year(movie.release_date)}
      action={<MarkButtons target={{ kind: "movie", movie }} state={marks} lists={lists} />}
    />
  );
}

/** A horizontal run of posters with a heading, the shape Discover is made of. */
export function Rail({ title, children, empty = "Nothing to show right now." }: { title: string; children: React.ReactNode[]; empty?: string }) {
  return (
    <section className="mt-10">
      {children.length === 0 ? (
        <>
          <h2 className="!text-[clamp(24px,3vw,32px)] mb-3">{title}</h2>
          <p className="text-sm text-dim">{empty}</p>
        </>
      ) : (
        <RailScroller title={title}>
          {children.map((c, i) => (
            <div key={i} className="w-[160px] sm:w-[180px] shrink-0 snap-start">
              {c}
            </div>
          ))}
        </RailScroller>
      )}
    </section>
  );
}
