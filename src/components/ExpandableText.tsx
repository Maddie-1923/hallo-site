"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { MASKED_OVERVIEW, useSpoilers } from "./Spoiler";

// The overview, as the app's ExpandableText: three lines, and a tap opens the
// rest, but only when there is more to show.
// `watched`, given for an episode's description, hides it behind the
// spoiler setting until the episode is watched.
export function ExpandableText({ text: given, watched }: { text: string; watched?: boolean }) {
  const hide = useSpoilers().descriptions && watched === false;
  const text = hide ? MASKED_OVERVIEW : given;
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !open) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);
  return (
    <p
      ref={ref}
      onClick={() => overflows && setOpen((o) => !o)}
      className={`m-0 text-[12.5px] leading-[1.6] text-mid-tone ${open ? "" : "line-clamp-3"} ${overflows ? "cursor-pointer" : ""}`}
    >
      {text}
    </p>
  );
}
