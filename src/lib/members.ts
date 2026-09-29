// The site's members, as the Members page and their profiles show them. Only
// made-up ones exist until accounts do (development only): the reviewers
// whose sample reviews sit on title pages and in notifications, and a few
// more, each with a sample profile of their own. All of this goes before the
// site opens (docs/social-plan.md, "Before opening").
export interface Member {
  username: string;
  displayName: string;
  location: string;
  bio: string;
  followers: number;
  following: number;
  reviews: number;
  films: number;
  shows: number;
  /** Days since they joined. */
  joined: number;
  /** Reviews liked this week, for "popular this week". */
  likesThisWeek: number;
  /** Which titles their sample profile leads with, so each one differs. */
  seed: number;
}

export const MEMBERS: Member[] = [
  { username: "moviemarta", displayName: "Marta Ruiz", location: "Madrid", bio: "Festival diaries and far too many double features.", followers: 2841, following: 312, reviews: 486, films: 1204, shows: 58, joined: 420, likesThisWeek: 318, seed: 0 },
  { username: "joelwatches", displayName: "Joel Park", location: "Toronto", bio: "One episode a night, no exceptions.", followers: 1522, following: 208, reviews: 233, films: 402, shows: 141, joined: 310, likesThisWeek: 204, seed: 3 },
  { username: "night.owl.nadia", displayName: "Nadia Okafor", location: "Lagos", bio: "Horror after midnight. Comedies to recover.", followers: 3960, following: 540, reviews: 712, films: 988, shows: 96, joined: 600, likesThisWeek: 411, seed: 6 },
  { username: "cinemasam", displayName: "Sam Weller", location: "Leeds", bio: "Slow cinema, fast opinions.", followers: 874, following: 150, reviews: 159, films: 1630, shows: 12, joined: 210, likesThisWeek: 96, seed: 9 },
  { username: "reeltalk.rosa", displayName: "Rosa Lind", location: "Stockholm", bio: "Writing about what I watch so I remember it.", followers: 1207, following: 402, reviews: 388, films: 530, shows: 77, joined: 150, likesThisWeek: 173, seed: 12 },
  { username: "kdramakai", displayName: "Kai Tan", location: "Singapore", bio: "K-dramas, anime and the occasional blockbuster.", followers: 2210, following: 190, reviews: 301, films: 215, shows: 264, joined: 95, likesThisWeek: 256, seed: 15 },
  { username: "popcornpriya", displayName: "Priya Nair", location: "Mumbai", bio: "Big screens, bigger snacks.", followers: 468, following: 233, reviews: 88, films: 344, shows: 40, joined: 21, likesThisWeek: 61, seed: 18 },
  { username: "theo.reruns", displayName: "Theo Marsh", location: "Melbourne", bio: "Rewatching the classics until they're new again.", followers: 139, following: 88, reviews: 37, films: 190, shows: 66, joined: 9, likesThisWeek: 22, seed: 21 },
];

export function member(username: string) {
  return MEMBERS.find((m) => m.username === username) ?? null;
}
