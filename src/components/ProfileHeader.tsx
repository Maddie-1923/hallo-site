import { image } from "@/lib/tmdb";
import type { LibraryArchive } from "@/lib/archive";
import type { Profile } from "@/lib/profile";
import { EditProfile } from "./EditProfile";

// The Letterboxd-style top of My Lists: a banner the person picked from their
// own library, an avatar that's a poster, their name, and four numbers. The
// banner bleeds to the page edges; everything under it sits in the wrap.
export function ProfileHeader({ profile, archive, email }: { profile: Profile; archive: LibraryArchive | null; email: string }) {
  // w1280 rather than `original`: the full-size file is several megabytes and
  // paints in visibly on a local server, which read as the banner failing to
  // reach the right edge. At a 340px-tall band there is nothing to gain from
  // the extra pixels.
  const banner = image.backdrop(profile.banner_path);
  const avatar = image.poster(profile.avatar_path, "w185");
  const name = profile.display_name || email.split("@")[0];
  const initial = (name[0] ?? "?").toUpperCase();

  const year = String(new Date().getFullYear());
  const shows = archive?.shows.length ?? 0;
  const movies = archive?.movies.length ?? 0;
  const episodes = archive?.watched.length ?? 0;
  const thisYear =
    Object.values(archive?.watchedDates ?? {}).filter((d) => d.startsWith(year)).length +
    Object.values(archive?.movieWatchedDates ?? {}).filter((d) => d.startsWith(year)).length;

  // What the picker can offer: every backdrop and poster the library holds.
  const backdrops = [
    ...(archive?.shows.map((t) => ({ path: t.show.backdrop_path, title: t.show.name })) ?? []),
    ...(archive?.movies.map((t) => ({ path: t.movie.backdrop_path, title: t.movie.title })) ?? []),
  ].filter((b): b is { path: string; title: string } => !!b.path);
  const posters = [
    ...(archive?.shows.map((t) => ({ path: t.show.poster_path, title: t.show.name })) ?? []),
    ...(archive?.movies.map((t) => ({ path: t.movie.poster_path, title: t.movie.title })) ?? []),
  ].filter((p): p is { path: string; title: string } => !!p.path);

  return (
    <header className="wrap pt-8 sm:pt-10">
      {/* The app's profile banner: a rounded card the width of the page's
          content, not a full-bleed strip. The avatar hangs off its bottom-left
          corner and the name sits on the artwork beside it, which is what
          makes the two read as one object rather than a picture with a header
          under it. */}
      <div className="relative rounded-3xl overflow-hidden bg-card aspect-[2.5/1] sm:aspect-[3.2/1] lg:aspect-[4/1] max-h-[300px]">
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
            // Which band of the picture survives. A backdrop is 16:9 and this
            // band is 4:1, so most of the height goes whatever happens; the
            // person who chose the picture is the only one who knows which
            // part of it mattered.
            style={{ objectPosition: `50% ${profile.banner_focus}%` }}
          />
        ) : (
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-fill) 35%, var(--page)), var(--page))" }} />
        )}
        {/* A little weight at the bottom edge so the avatar has something to
            sit against rather than floating on bright artwork. */}
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.35) 0%, transparent 30%, transparent 65%, rgba(0,0,0,.45) 100%)" }} />
        {/* Top-right of the artwork, where the app keeps its gear — it belongs
            to the banner it edits, and it leaves the row below to the stats. */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
          <EditProfile profile={profile} backdrops={backdrops} posters={posters} fallbackName={name} />
        </div>
      </div>

      <div className="relative flex flex-wrap items-end gap-5 -mt-9 sm:-mt-11">
        <div className="w-[104px] sm:w-[124px] h-[104px] sm:h-[124px] rounded-full overflow-hidden border-4 border-page bg-card shrink-0 shadow-[0_8px_24px_rgba(0,0,0,.5)]">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center display text-5xl bg-accent-fill text-graphite">{initial}</div>
          )}
        </div>
        <div className="min-w-0 pb-1">
          <h1 className="!text-[clamp(28px,4.5vw,44px)] leading-none truncate">{name}</h1>
          <p className="text-sm text-dim m-0 mt-1.5">My Lists</p>
        </div>
        {/* One box holding all four numbers, hairlines between them. */}
        <div className="ml-auto mb-1 flex items-stretch rounded-xl border border-hair bg-card px-1 py-3 divide-x divide-hair">
          <Stat n={shows} label="Shows" />
          <Stat n={movies} label="Films" />
          <Stat n={episodes} label="Episodes" />
          <Stat n={thisYear} label="This year" />
        </div>
      </div>
    </header>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-center px-4 sm:px-5">
      <div className="display text-2xl sm:text-3xl leading-none">{n.toLocaleString()}</div>
      <div className="text-[10px] font-bold tracking-[.14em] uppercase text-dim mt-1">{label}</div>
    </div>
  );
}
