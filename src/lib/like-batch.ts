import { likeInfoMany, type TargetKind } from "./social-actions";

// Likes and comment counts for everything on a page, asked in one go: each
// card asks for its own (likeInfoBatched), the asks made in the same moment
// are gathered for a few milliseconds and sent as one request (likeInfoMany).

type Info = { count: number; liked: boolean; comments: number } | null;
type Ask = { kind: TargetKind; owner: string; target: string; resolve: (i: Info) => void };

let queue: Ask[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  const asks = queue;
  queue = [];
  timer = null;
  likeInfoMany(asks.map(({ kind, owner, target }) => ({ kind, owner, target })))
    .then((answers) => asks.forEach((a, i) => a.resolve(answers[i] ?? null)))
    .catch(() => asks.forEach((a) => a.resolve(null)));
}

export function likeInfoBatched(kind: TargetKind, owner: string, target: string): Promise<Info> {
  return new Promise((resolve) => {
    queue.push({ kind, owner, target, resolve });
    if (queue.length >= 100) {
      if (timer) clearTimeout(timer);
      flush();
    } else if (!timer) timer = setTimeout(flush, 15);
  });
}
