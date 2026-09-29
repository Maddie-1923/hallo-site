// The shape of a person's settings and their defaults, shared by the
// browser's copy (lib/settings.ts) and the server that keeps the account's
// (lib/account-settings.ts).
export interface Settings {
  displayName: string;
  // Privacy.
  publicProfile: boolean;
  showActivity: boolean;
  showWatchlog: boolean;
  allowFollows: boolean;
  // Notifications, by email.
  notifyFollows: boolean;
  notifyLikes: boolean;
  notifyComments: boolean;
  weeklyDigest: boolean;
  // Where they watch.
  region: string | null;
  services: number[];
  onlyMyServices: boolean;
  // How things read.
  dateFormat: "day-month" | "month-day" | "numeric";
  // Spoilers, until an episode is watched.
  hideTitles: boolean;
  hideDescriptions: boolean;
  hideImages: boolean;
}

export const DEFAULTS: Settings = {
  displayName: "",
  publicProfile: true,
  showActivity: true,
  showWatchlog: true,
  allowFollows: true,
  notifyFollows: true,
  notifyLikes: true,
  notifyComments: true,
  weeklyDigest: false,
  region: null,
  services: [],
  onlyMyServices: false,
  dateFormat: "day-month",
  hideTitles: false,
  hideDescriptions: false,
  hideImages: false,
};

/** The settings that live on the profile, because they decide what visitors
    see, and the column each is kept in. publicProfile is stored inverted,
    as is_private. The rest are the person's own, in user_settings. */
export const PROFILE_SETTINGS = {
  displayName: "display_name",
  publicProfile: "is_private",
  showActivity: "show_activity",
  showWatchlog: "show_watchlog",
  allowFollows: "allow_follows",
} as const satisfies Partial<Record<keyof Settings, string>>;

/** Only known settings, each of the right type: what the server will save. */
export function cleanSettings(patch: Record<string, unknown>): Partial<Settings> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in DEFAULTS)) continue;
    const d = DEFAULTS[k as keyof Settings];
    if (k === "region") {
      if (v === null || (typeof v === "string" && /^[A-Z]{2}$/.test(v))) out[k] = v;
    } else if (k === "services") {
      if (Array.isArray(v) && v.length <= 200 && v.every((x) => Number.isInteger(x))) out[k] = v;
    } else if (k === "dateFormat") {
      if (v === "day-month" || v === "month-day" || v === "numeric") out[k] = v;
    } else if (typeof d === "boolean") {
      if (typeof v === "boolean") out[k] = v;
    } else if (typeof d === "string") {
      if (typeof v === "string") out[k] = v.slice(0, 80);
    }
  }
  return out as Partial<Settings>;
}
