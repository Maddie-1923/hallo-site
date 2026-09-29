// What's new: the dated notes on the What's new page, newest first. Edit
// here; the page draws whatever is in this list. `status` says whether the
// thing can be used yet: "live", "in review" (with Apple), or "coming soon".
export type Update = {
  date: string; // YYYY-MM-DD
  where: "App" | "Website";
  status: "live" | "in review" | "coming soon";
  title: string;
  summary: string;
  points: string[];
};

export const updates: Update[] = [
  {
    date: "2026-09-29",
    where: "Website",
    status: "coming soon",
    title: "Title pages, profiles and reviews",
    summary: "The website grows from a window onto the app into somewhere to keep your own record and read everyone else's.",
    points: [
      "Film, show and episode pages laid out like the app's: the facts, trailers that play on the page, cast, crew, details and release dates.",
      "Where to watch in your country, and every service that carries it anywhere else.",
      "Show pages list every season, with a small episode page beside the list.",
      "A page for every actor, director and crew member, with everything they've worked on.",
      "Your take on anything: a rating, how it left you, a review, a private note and tags.",
      "Public profiles with your Watchlog, categories, reviews and stats, and a page for each review made for sharing.",
      "Kodigo Pro and this page, What's new.",
    ],
  },
  {
    date: "2026-09-24",
    where: "App",
    status: "in review",
    title: "Kodigo 1.0 for iPhone",
    summary: "The first release, with Apple for review.",
    points: [
      "Up Next: every show you're partway through in one queue, checked off in a tap.",
      "Coming Soon, counted down to the day, and reminders when an episode lands, a season premieres or a film opens.",
      "Films beside shows in one library, and where to watch each one.",
      "Widgets for your home screen, and Siri to ask what's next or mark an episode off.",
      "Ratings, moods, notes, tags, lists and stats worth reading.",
      "Bring your history from TV Time, Letterboxd, Trakt, Simkl or IMDb, or add shows in bulk.",
      "Seven accent themes, two dark styles, and spoiler protection.",
    ],
  },
];
