"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Movie, Review, Show } from "@/lib/archive";
import { setLoved, trackMovie, trackShow } from "@/lib/library-actions";
import { MarkHeart, MarkList, MarkWatched } from "./marks";
import { MarkMenu } from "./MarkMenu";
import type { ListOption } from "@/lib/marks";

export type MarkState = { loved: boolean; watched: boolean; tracked: boolean; rating: number | null; listIDs: string[]; review: Review | null };

type Target = { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };

// The three marks on a card or the hero: heart, watched, list. Heart goes red
// (the app's `loved` colour) and files the title under Favorites; watched
// goes green (the app's `badgeOn`) — for a film that's Watched, for a show
// it's Watching, since a whole show isn't one tick. List opens the menu —
// rate, save, put on a list, open, remove. Signed out, any mark sends you to
// sign in and back to this page.
export function MarkButtons({ target, state, lists = [], size = "sm" }: { target: Target; state: MarkState; lists?: ListOption[]; size?: "sm" | "lg" }) {
  // The anchor is state rather than a ref so the menu can read it in render.
  const [listButton, setListButton] = useState<HTMLButtonElement | null>(null);
  const [menu, setMenu] = useState(false);
  const router = useRouter();
  const [, start] = useTransition();
  const [shown, setShown] = useOptimistic(state, (s: MarkState, patch: Partial<MarkState>) => ({ ...s, ...patch }));
  const title = target.kind === "show" ? target.show.name : target.movie.title;

  function run(patch: Partial<MarkState>, action: () => Promise<{ error?: string }>) {
    start(async () => {
      setShown(patch);
      const r = await action();
      if (r.error) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      router.refresh();
    });
  }

  const dim = size === "lg" ? 48 : 32;
  // The Canva glyphs sit inside a lot of padding in their 768 box, so they
  // are drawn larger than the button would suggest to read at the same
  // weight as a line icon.
  const glyph = size === "lg" ? 32 : 22;
  const base = `rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer border`;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={shown.loved ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
        aria-pressed={shown.loved}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          run({ loved: !shown.loved }, () => setLoved(target, !shown.loved));
        }}
        className={base}
        style={{
          width: dim,
          height: dim,
          background: shown.loved ? "var(--loved)" : "color-mix(in srgb, var(--ink) 15%, transparent)",
          borderColor: shown.loved ? "var(--loved)" : "transparent",
          color: shown.loved ? "#fff" : "var(--ink)",
        }}
      >
        <MarkHeart size={glyph} />
      </button>

      <button
        type="button"
        aria-label={
          target.kind === "movie"
            ? shown.watched ? `Mark ${title} as not watched` : `Mark ${title} as watched`
            : shown.watched ? `Stop watching ${title}` : `Start watching ${title}`
        }
        aria-pressed={shown.watched}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const next = !shown.watched;
          run({ watched: next }, () =>
            target.kind === "movie" ? trackMovie(target.movie, next ? "Watched" : "To Watch") : trackShow(target.show, next ? "Watching" : "Stopped"),
          );
        }}
        className={base}
        style={{
          width: dim,
          height: dim,
          background: shown.watched ? "var(--seen)" : "color-mix(in srgb, var(--ink) 15%, transparent)",
          borderColor: shown.watched ? "var(--seen)" : "transparent",
          color: shown.watched ? "var(--graphite)" : "var(--ink)",
        }}
      >
        <MarkWatched size={glyph} />
      </button>

      <div className="relative">
        <button
          ref={setListButton}
          type="button"
          aria-label={`More for ${title}`}
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenu((m) => !m);
          }}
          className={base}
          style={{
            width: dim,
            height: dim,
            background: menu || shown.listIDs.length > 0 ? "var(--accent-fill)" : "color-mix(in srgb, var(--ink) 15%, transparent)",
            borderColor: "transparent",
            color: menu || shown.listIDs.length > 0 ? "var(--graphite)" : "var(--ink)",
          }}
        >
          <MarkList size={glyph} />
        </button>
        {menu && <MarkMenu target={target} state={shown} lists={lists} anchor={listButton} onClose={() => setMenu(false)} />}
      </div>
    </div>
  );
}
