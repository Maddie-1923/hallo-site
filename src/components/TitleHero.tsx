import { image, type RawPerson } from "@/lib/tmdb";

/** Backdrop-washed header for a title page. Children are the poster and copy. */
export function Hero({ backdrop, children }: { backdrop: string | null | undefined; children: React.ReactNode }) {
  const src = image.backdrop(backdrop);
  return (
    <header className="relative border-b border-hair overflow-hidden">
      {src && (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${src})`, maskImage: "linear-gradient(to bottom, black, transparent)" }}
        />
      )}
      <div className="wrap relative flex gap-8 items-start py-12 flex-col sm:flex-row">{children}</div>
    </header>
  );
}

export function CastRow({ cast }: { cast: RawPerson[] }) {
  return (
    <section>
      <div className="rule" />
      <div className="eyebrow">Cast</div>
      <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]">
        {cast.map((p) => {
          const src = image.profile(p.profile_path);
          return (
            <div key={p.id} className="w-[110px] shrink-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-card border border-hair">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="mt-2 text-xs font-semibold leading-tight">{p.name}</div>
              {p.character && <div className="text-xs text-dim leading-tight">{p.character}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
