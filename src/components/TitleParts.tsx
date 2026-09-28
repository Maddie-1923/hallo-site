import Link from "next/link";
import type { CastMember, RailTitle, WhereToWatch } from "@/lib/tmdb";
import { ExpandableText } from "./ExpandableText";
import { Glyph } from "./Glyph";
import { ElsewhereSheet } from "./ElsewhereSheet";

// The pieces of a title's page, drawn after the app's detail screens
// (MovieDetailView and ShowDetailView): a header card of the artwork, a facts
// panel and the overview; sections under Bebas heading pills, each in a card;
// and rails of cast and of more like this. The app's colours are the site's
// tokens: `card` for a card, `piece` for the panels inside it (kodigoRowPiece),
// `well` for a row card, `hair` for hairlines.

/** A section's heading, as the app draws it: Bebas capitals on a pill. */
export function HeadingPill({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="inline-flex items-center h-11 px-3.5 rounded-[10px] bg-piece !text-[24px] !leading-none tracking-[.02em] uppercase pt-1">
      {children}
    </h2>
  );
}

/** A card: the app's section card, with its lit edge and soft shadow. */
export function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)] ${className}`}>
      {children}
    </div>
  );
}

/** A section: its heading pill, then its content 12px under it. */
export function Section({ title, children, tight = false }: { title: string; children: React.ReactNode; tight?: boolean }) {
  return (
    <section className={`grid ${tight ? "gap-2" : "gap-3"} content-start`}>
      <div>
        <HeadingPill>{title}</HeadingPill>
      </div>
      {children}
    </section>
  );
}

/** The header card: the wide artwork, the facts panel under it with the title
    and its label/value rows, the overview, and whatever tray the page adds. */
export function HeaderCard({
  art,
  title,
  titleOnBanner = false,
  subtitle,
  facts,
  overview,
  factsFooter,
  children,
}: {
  /** The wide artwork at the card's head, as the app has it; left out when
      the page shows the picture as a banner across the top instead. */
  art?: string | null;
  title: string;
  /** The title is on the banner as its own logo artwork, so the card keeps
      it for screen readers only. */
  titleOnBanner?: boolean;
  subtitle?: string;
  facts: { label: string; value: React.ReactNode; accent?: boolean }[];
  overview: string | null;
  /** A closing line under the facts (a show's "Last aired" and its pill). */
  factsFooter?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] bg-card p-2 grid gap-2">
      {art !== undefined && (
        <div className="aspect-video rounded-[14px] overflow-hidden bg-piece border-[0.5px] border-[color:color-mix(in_srgb,var(--dim)_35%,transparent)]">
          {art && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      )}
      <div className="rounded-[12px] bg-piece p-3">
        <h1 className={titleOnBanner ? "sr-only" : "!text-[clamp(30px,3vw,37px)] !leading-[.95] tracking-[.04em] uppercase"}>{title}</h1>
        {subtitle && <div className={`display text-[22px] leading-none tracking-[.03em] uppercase ${titleOnBanner ? "" : "mt-0.5"}`}>{subtitle}</div>}
        {/* A hairline under the title, when there is one to sit under. */}
        <div className={subtitle || !titleOnBanner ? "mt-2.5 border-t border-hair" : "-mt-[9px]"}>
          {facts.map((f, i) => (
            <div key={f.label} className={`flex items-baseline justify-between gap-4 py-[9px] text-[15px] ${i < facts.length - 1 ? "border-b border-hair" : ""}`}>
              <span className="text-dim shrink-0">{f.label}</span>
              <span className={`text-right min-w-0 ${f.accent ? "text-accent" : "text-ink"}`}>{f.value}</span>
            </div>
          ))}
        </div>
        {factsFooter && <div className="pt-[9px] border-t border-hair">{factsFooter}</div>}
      </div>
      {overview && (
        <div className="rounded-[12px] bg-piece p-3">
          <ExpandableText text={overview} />
        </div>
      )}
      {children}
    </div>
  );
}

/** Where to watch in the visitor's country: subscription services, then the
    free ones under a small label; each logo goes on to TMDB's page for the
    country, which lists them through JustWatch. */
export function WhereToWatchSection({ watch }: { watch: WhereToWatch }) {
  const logo = (p: WhereToWatch["subscription"][number]) => (
    <a key={p.id} href={watch.link ?? undefined} target="_blank" rel="noreferrer" title={p.name} className="shrink-0 w-10 h-10 rounded-[8px] overflow-hidden border border-hair bg-card">
      {p.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.logo} alt={p.name} className="w-full h-full object-cover" />
      )}
    </a>
  );
  // A row of logos; the first row ends on the arrow to the other countries.
  const row = (ps: WhereToWatch["subscription"], first: boolean) => (
    <div className="flex items-center gap-2.5">
      <div className="flex gap-2.5 overflow-x-auto [scrollbar-width:none] min-w-0">{ps.map(logo)}</div>
      {first && <span className="ml-auto"><ElsewhereSheet entries={watch.elsewhere} /></span>}
    </div>
  );
  const home = watch.subscription.length > 0 || watch.free.length > 0;
  // Nowhere here: five of the services elsewhere, and how many more.
  const abroad = watch.elsewhere.slice(0, 5).map((e) => e.provider);
  return (
    <Section title="Where to watch" tight>
      <SectionCard>
        <div className="rounded-[14px] bg-piece p-3 grid gap-2">
          {watch.subscription.length > 0 && row(watch.subscription, true)}
          {watch.free.length > 0 && (
            <>
              <div className="text-[11px] font-bold uppercase text-dim">Free</div>
              {row(watch.free, watch.subscription.length === 0)}
            </>
          )}
          {!home && (
            <>
              <div className="text-[13px] text-dim">Not streaming here. Elsewhere:</div>
              <div className="flex items-center gap-2.5">
                <div className="flex gap-2.5 min-w-0">
                  {abroad.map((p) => (
                    <span key={p.id} title={p.name} className="shrink-0 w-10 h-10 rounded-[8px] overflow-hidden border border-hair bg-card">
                      {p.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.logo} alt={p.name} className="w-full h-full object-cover" />
                      )}
                    </span>
                  ))}
                  {watch.elsewhere.length > 5 && <span className="self-center text-[13px] text-dim">+{watch.elsewhere.length - 5}</span>}
                </div>
                <span className="ml-auto"><ElsewhereSheet entries={watch.elsewhere} /></span>
              </div>
            </>
          )}
          <div className="text-[11px] text-dim">Streaming data by JustWatch</div>
        </div>
      </SectionCard>
    </Section>
  );
}

/** The trailer: its YouTube picture with a play mark, going to YouTube. The
    picture's corners follow the card's (20px, less the card's 8px inset). */
export function TrailerSection({ id }: { id: string }) {
  return (
    <Section title="Trailer">
      <SectionCard>
        <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer" className="group block no-underline text-ink">
          <span className="relative block aspect-video rounded-[12px] overflow-hidden border border-white/15 shadow-[0_10px_18px_rgba(0,0,0,.34)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center">
              <svg width="54" height="54" viewBox="0 0 24 24" aria-hidden className="drop-shadow-[0_4px_8px_rgba(0,0,0,.5)] group-hover:scale-105 transition-transform">
                <circle cx="12" cy="12" r="11" fill="white" />
                <path d="M10 8.2v7.6L16 12z" fill="#1a1a19" />
              </svg>
            </span>
          </span>
          <span className="block mt-2 px-1 pb-0.5">
            <span className="text-[17px] font-semibold">Watch trailer</span>
            <span className="text-[12px] text-dim"> · YouTube</span>
          </span>
        </a>
      </SectionCard>
    </Section>
  );
}

/** A row card, as the app wraps rail tiles: the well, an inner piece. */
function RowCard({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <div
      className="shrink-0 rounded-[16px] bg-well p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)] snap-start"
      style={{ width }}
    >
      {children}
    </div>
  );
}

function Rail({ children }: { children: React.ReactNode }) {
  return <div className="soft-scroll flex gap-3 overflow-x-auto snap-x pb-3 -mb-3">{children}</div>;
}

export function CastSection({ cast }: { cast: CastMember[] }) {
  return (
    <Section title="Cast">
      <Rail>
        {cast.map((p) => (
          <RowCard key={`${p.id}-${p.character}`} width={120}>
            <div className="rounded-[12px] bg-piece overflow-hidden">
              <div className="aspect-[2/3] rounded-t-[12px] rounded-b-[8px] overflow-hidden bg-card flex items-center justify-center">
                {p.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-dim opacity-45" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </div>
              <div className="p-2.5">
                <div className="text-[12px] leading-[15px] font-semibold text-ink line-clamp-2 min-h-[30px]">{p.name}</div>
                <div className="text-[12px] leading-[15px] text-dim truncate">{p.character}</div>
              </div>
            </div>
          </RowCard>
        ))}
      </Rail>
    </Section>
  );
}

/** More like this: poster cards with the app's two keys under them. */
export function MoreLikeThisSection({ items, kind }: { items: RailTitle[]; kind: "movie" | "show" }) {
  return (
    <Section title="More like this">
      <Rail>
        {items.map((m) => (
          <RowCard key={m.id} width={150}>
            <Link href={`/${kind}/${m.id}`} className="block rounded-[12px] bg-piece overflow-hidden no-underline text-ink group">
              <div className="aspect-[2/3] rounded-t-[12px] rounded-b-[8px] overflow-hidden bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.poster && <img src={m.poster} alt="" loading="lazy" className="w-full h-full object-cover" />}
              </div>
              <div className="px-2.5 pt-2.5 pb-1">
                <div className="text-[12px] leading-[15px] font-semibold truncate group-hover:text-accent transition-colors">{m.title}</div>
                <div className="text-[12px] leading-[15px] text-dim">{m.year}</div>
              </div>
            </Link>
            <div className="mt-2 flex gap-2">
              <span className="flex-1 h-10 rounded-[10px] bg-piece text-dim flex items-center justify-center" title="More">
                <Glyph name="ellipsis" />
              </span>
              <span className="flex-1 h-10 rounded-[10px] bg-piece text-dim flex items-center justify-center" title="Add">
                <Glyph name="plus" />
              </span>
            </div>
          </RowCard>
        ))}
      </Rail>
    </Section>
  );
}

/** The title's picture across the top of its page, the way a profile's
    banner is drawn: the whole width, rounded, the full-size picture. The
    crop keeps the upper part, where faces usually are. */
export function TitleBanner({ art, logo, title }: { art: string | null; logo?: string | null; title?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] h-[clamp(300px,40vw,540px)] bg-card">
      {art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt="" className="absolute inset-0 w-full h-full object-cover object-[center_25%]" />
      )}
      {/* The title in its own lettering: the studio's logo artwork, low on
          the left, over a shade that keeps a pale logo readable whatever the
          picture is doing there. */}
      {logo && (
        <>
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(20deg,rgba(0,0,0,.62)_0%,rgba(0,0,0,.25)_35%,transparent_60%)]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={title ?? ""} className="absolute left-[clamp(20px,3vw,44px)] bottom-[clamp(20px,3vw,40px)] max-w-[33%] max-h-[30%] object-contain object-left-bottom drop-shadow-[0_2px_12px_rgba(0,0,0,.5)]" />
        </>
      )}
    </div>
  );
}
