import { poster } from "@/lib/archive";

// A plain <img> rather than next/image: the posters come from TMDB's CDN at a
// fixed size, and routing them through the image optimizer would add a
// remotePatterns entry and a second hop for no gain.
export function Poster({
  path,
  alt,
  className = "",
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const src = poster(path);
  return (
    <div className={`aspect-[2/3] rounded-xl overflow-hidden bg-card border border-hair ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-3 text-center text-xs text-dim">{alt}</div>
      )}
    </div>
  );
}
