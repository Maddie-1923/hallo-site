import type { ListView } from "./lists";

// The Lists hub's sections, each with every list that belongs in it and how
// many the hub shows. The hub shows the first `shown`; a section with more
// than that gets a chevron to its own page (/lists/<slug>), which shows them
// all. Featured and your own lists always show whole.
export interface ListGroup {
  slug: string;
  title: string;
  lists: ListView[];
  shown: number;
}

export function listGroups(lists: ListView[], me: string | null): ListGroup[] {
  const others = lists.filter((l) => l.owner !== me);
  const week = (l: ListView) => l.likesWeek ?? l.likes;
  // A topic row once a genre has two lists in it, the fullest topics first.
  const byTopic = new Map<string, ListView[]>();
  for (const l of others) if (l.topic) byTopic.set(l.topic, [...(byTopic.get(l.topic) ?? []), l]);
  const topics = [...byTopic.entries()].filter(([, ls]) => ls.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 5);
  const all = Infinity;
  return [
    { slug: "featured", title: "Featured", lists: lists.filter((l) => l.featured), shown: all },
    { slug: "popular", title: "Popular this week", lists: [...others].filter((l) => week(l) > 0).sort((a, b) => week(b) - week(a)), shown: 8 },
    { slug: "most-liked", title: "Most liked", lists: [...others].filter((l) => l.likesWeek !== undefined && l.likes > 0).sort((a, b) => b.likes - a.likes), shown: 8 },
    { slug: "recent", title: "Recently updated", lists: others.filter((l) => l.likesWeek !== undefined), shown: 8 },
    { slug: "big", title: "Big lists to dig into", lists: [...others].sort((a, b) => b.titles.length - a.titles.length), shown: 4 },
    ...topics.map(([topic, ls]): ListGroup => ({ slug: `topic-${topicSlug(topic)}`, title: topic, lists: ls, shown: 8 })),
    { slug: "yours", title: "Your lists", lists: lists.filter((l) => l.owner === me), shown: all },
  ];
}

export function topicSlug(topic: string) {
  return topic.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
