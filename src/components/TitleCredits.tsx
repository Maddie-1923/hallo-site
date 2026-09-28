import Link from "next/link";
import type { CastMember, CrewGroup, ReleaseGroup, TitleDetails } from "@/lib/tmdb";
import { ProfileSections } from "./ProfileNav";
import { CastRail } from "./TitleParts";
import { Themes } from "./Themes";

// The credits and facts under a title, as Letterboxd keeps them, in the
// profile's tabs: Cast (the app's portrait rail), Crew, Details, Genres, and
// Releases for a film or Air dates for a series. Each tab is rows of a label
// on the left and chips on the right, ruled between like the About card.
export function TitleCredits({
  cast,
  crew,
  details,
  genres,
  keywords,
  releases,
  airing,
}: {
  cast: CastMember[];
  crew: CrewGroup[];
  details: TitleDetails;
  genres: string[];
  keywords: string[];
  releases?: ReleaseGroup[];
  airing?: { networks: { name: string; logo: string | null }[]; seasons: { name: string; date: string | null; episodes: number }[]; ratings: { country: string; rating: string }[] };
}) {
  const sections = [
    cast.length > 0 && { id: "cast", label: "Cast", count: cast.length, bare: true, content: <CastRail cast={cast} /> },
    crew.length > 0 && {
      id: "crew",
      label: "Crew",
      content: (
        <Rows>
          {crew.map((g) => (
            <Row key={g.label} label={g.label}>
              {g.people.map((p) => (
                <Chip key={p.id} href={`/person/${p.id}`}>
                  {p.name}
                </Chip>
              ))}
            </Row>
          ))}
        </Rows>
      ),
    },
    { id: "details", label: "Details", content: <Details d={details} /> },
    (genres.length > 0 || keywords.length > 0) && {
      id: "genres",
      label: "Genres",
      content: (
        <Rows>
          {genres.length > 0 && (
            <Row label={genres.length === 1 ? "Genre" : "Genres"}>
              {genres.map((g) => (
                <Chip key={g}>{g}</Chip>
              ))}
            </Row>
          )}
          {keywords.length > 0 && (
            <Row label="Themes">
              <Themes items={keywords} />
            </Row>
          )}
        </Rows>
      ),
    },
    releases && releases.length > 0 && { id: "releases", label: "Releases", content: <Releases groups={releases} /> },
    airing && { id: "air-dates", label: "Air dates", content: <AirDates airing={airing} /> },
  ].filter(Boolean) as { id: string; label: string; count?: number; bare?: boolean; content: React.ReactNode }[];

  // min-w-0: a grid item otherwise grows to its widest child, and a rail of
  // fifteen cards would stretch the whole section off the page.
  return <ProfileSections sections={sections} className="min-w-0" label="Credits and details" />;
}

function Rows({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-hair">{children}</div>;
}

/** A label on the left, what it holds on the right. */
export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4 py-3 first:pt-0 last:pb-0">
      <div className="pt-[5px] text-[11px] font-bold uppercase tracking-[.1em] text-dim">{label}</div>
      <div className="flex flex-wrap gap-1.5 min-w-0">{children}</div>
    </div>
  );
}

export function Chip({ href, children }: { href?: string; children: React.ReactNode }) {
  const cls = "inline-flex items-center rounded-[8px] bg-piece px-2.5 py-[5px] text-[12.5px] leading-[1.2] text-ink no-underline";
  return href ? (
    <Link href={href} className={`${cls} hover:text-accent transition-colors`}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}

function Details({ d }: { d: TitleDetails }) {
  return (
    <Rows>
      {d.networks && d.networks.length > 0 && (
        <Row label={d.networks.length === 1 ? "Network" : "Networks"}>
          {d.networks.map((n) => (
            <Chip key={n}>{n}</Chip>
          ))}
        </Row>
      )}
      {d.studios.length > 0 && (
        <Row label={d.studios.length === 1 ? "Studio" : "Studios"}>
          {d.studios.map((n) => (
            <Chip key={n}>{n}</Chip>
          ))}
        </Row>
      )}
      {d.countries.length > 0 && (
        <Row label={d.countries.length === 1 ? "Country" : "Countries"}>
          {d.countries.map((n) => (
            <Chip key={n}>{n}</Chip>
          ))}
        </Row>
      )}
      {d.languages.length > 0 && (
        <Row label={d.languages.length === 1 ? "Language" : "Languages"}>
          {d.languages.map((n) => (
            <Chip key={n}>{n}</Chip>
          ))}
        </Row>
      )}
      {d.alternativeTitles.length > 0 && (
        <Row label="Also known as">
          <p className="m-0 pt-[3px] text-[12.5px] leading-[1.6] text-mid-tone">{d.alternativeTitles.join(", ")}</p>
        </Row>
      )}
      <Row label="More at">
        {d.imdb && (
          <a href={d.imdb} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-[8px] border border-hair px-2.5 py-[5px] text-[12px] font-bold tracking-[.04em] text-ink no-underline hover:text-accent">
            IMDb
          </a>
        )}
        <a href={d.tmdb} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-[8px] border border-hair px-2.5 py-[5px] text-[12px] font-bold tracking-[.04em] text-ink no-underline hover:text-accent">
          TMDB
        </a>
      </Row>
    </Rows>
  );
}

/** A country's flag from its two letters. */
function flag(code: string) {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "";
}

const names = new Intl.DisplayNames(["en"], { type: "region" });
const country = (code: string) => {
  try {
    return names.of(code) ?? code;
  } catch {
    return code;
  }
};

function shortDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Where each country could see it, and when: grouped by kind of release,
    each day a line with the countries that had it then. */
function Releases({ groups }: { groups: ReleaseGroup[] }) {
  return (
    <div className="grid gap-5">
      {groups.map((g) => {
        const days = new Map<string, typeof g.releases>();
        for (const r of g.releases) days.set(r.date, [...(days.get(r.date) ?? []), r]);
        return (
          <div key={g.label}>
            <div className="pb-2 text-[11px] font-bold uppercase tracking-[.1em] text-dim border-b border-hair">{g.label}</div>
            <div className="divide-y divide-hair">
              {[...days.entries()].map(([date, rs]) => (
                <div key={date} className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 py-2.5 text-[12.5px]">
                  <span className="text-dim tabular-nums pt-[1px]">{shortDate(date)}</span>
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {rs.map((r, i) => (
                      <span key={`${r.country}${i}`} className="inline-flex items-center gap-1.5">
                        <span aria-hidden>{flag(r.country)}</span>
                        <b className="font-semibold text-ink">{country(r.country)}</b>
                        {r.certification && <span className="rounded-[4px] border border-hair px-1 text-[10.5px] font-bold text-ink leading-[1.5]">{r.certification}</span>}
                        {r.note && <span className="text-dim">{r.note}</span>}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A series' Air dates: its networks, when each season began, and its age
    ratings around the world. */
function AirDates({ airing }: { airing: { networks: { name: string; logo: string | null }[]; seasons: { name: string; date: string | null; episodes: number }[]; ratings: { country: string; rating: string }[] } }) {
  return (
    <Rows>
      {airing.seasons.length > 0 && (
        <Row label="Seasons">
          <div className="w-full divide-y divide-hair">
            {airing.seasons.map((s) => (
              <div key={s.name} className="grid grid-cols-[100px_minmax(0,1fr)_auto] gap-3 py-2 first:pt-[3px] text-[12.5px]">
                <span className="text-dim tabular-nums">{s.date ? shortDate(s.date) : "To come"}</span>
                <b className="font-semibold text-ink">{s.name}</b>
                <span className="text-dim">{s.episodes} episodes</span>
              </div>
            ))}
          </div>
        </Row>
      )}
      {airing.ratings.length > 0 && (
        <Row label="Rated">
          {airing.ratings.map((r) => (
            <span key={r.country} className="inline-flex items-center gap-1.5 rounded-[8px] bg-piece px-2.5 py-[5px] text-[12.5px] leading-[1.2] text-ink" title={country(r.country)}>
              <span aria-hidden>{flag(r.country)}</span>
              {r.rating}
            </span>
          ))}
        </Row>
      )}
    </Rows>
  );
}
