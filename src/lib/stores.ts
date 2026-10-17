// Where to get the app. Each address is set once its store listing is live
// (NEXT_PUBLIC_APP_STORE_URL, NEXT_PUBLIC_PLAY_STORE_URL); until then the
// button for that store says it's coming instead of linking anywhere. The
// iPhone app is live, so its listing is the default here rather than only in
// Vercel's settings, where it had never been filled in.
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || "https://apps.apple.com/app/id6807283276";
export const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL || null;
