/**
 * The app's twelve moods, in the app's order, with the emoji it uses.
 *
 * The emoji are never translated — a symbol means the same thing in every
 * language, and swapping one for a local equivalent changes what the mood is
 * rather than how it reads. `Mood` in Models.swift is the source; the raw
 * values below are the strings the archive stores.
 */
export const MOODS: { id: string; emoji: string; label: string }[] = [
  { id: "lovedIt", emoji: "❤️", label: "Loved it" },
  { id: "hatedIt", emoji: "😡", label: "Hated it" },
  { id: "likedIt", emoji: "🙂", label: "Liked it" },
  { id: "sad", emoji: "😭", label: "Sad" },
  { id: "onEdge", emoji: "🫣", label: "On Edge" },
  { id: "boring", emoji: "🥱", label: "Boring" },
  { id: "frustrated", emoji: "😤", label: "Frustrated" },
  { id: "disappointed", emoji: "😞", label: "Disappointed" },
  { id: "hot", emoji: "❤️‍🔥", label: "Hot" },
  { id: "shocked", emoji: "🤯", label: "Shocked" },
  { id: "scared", emoji: "😱", label: "Scared" },
  { id: "confused", emoji: "🙃", label: "Confused" },
];

/** `Library.moodLimit` — three per title, the app's cap. */
export const MOOD_LIMIT = 3;
