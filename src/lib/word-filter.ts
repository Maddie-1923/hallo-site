// A basic word filter for what people write where others see it: comments,
// review text, list names, display names, profile text and usernames. It
// catches the worst words at the door, including the usual disguises
// (n1gg3r, f.a.g, fagggot); reports and the moderation page handle
// everything else. Used in the browser for an instant message and again on
// the server, which is the one that counts.
//
// The word lists are base64 so this file isn't a wall of slurs; decode with
// atob() to read or change them. Short slurs only match as whole words, so
// "raccoon", "spice" and "Scunthorpe" pass. Words that turn up in ordinary
// film talk ("Dick Van Dyke", "a chink in the armour", Nazis in a war film)
// are left to reports, or only refused in names.
const decode = (s: string) => (typeof atob === "function" ? atob(s) : Buffer.from(s, "base64").toString()).split("|");
const SLURS = decode("bmlnZ2VyfG5pZ2dhfGZhZ2dvdHxmYWd8ZmFnc3xyZXRhcmR8cmV0YXJkZWR8dHJhbm55fHRyYW5uaWVzfGtpa2V8c3BpY3xnb29rfHdldGJhY2t8Y29vbnxyYWdoZWFkfHRvd2VsaGVhZHxiZWFuZXJ8cGFraXxzYW5kbmlnZ2VyfHNoZW1hbGU=");
const INSIDE = decode("bmlnZ2VyfG5pZ2dhfGZhZ2dvdHx0cmFubnl8d2V0YmFja3xyYWdoZWFkfHRvd2VsaGVhZHxzYW5kbmlnZ2Vy");
const NAME_ONLY = decode("ZnVja3xzaGl0fGN1bnR8Yml0Y2h8d2hvcmV8c2x1dHxwb3JufGNvY2t8cHVzc3l8cmFwZXxyYXBpc3R8aGl0bGVyfHBlZG98cGVkb3BoaWxlfGNoaW5rfG5hemk=");

/** Names nobody can take: they'd look official, or are the site's own paths. */
const RESERVED = new Set([
  "admin", "administrator", "kodigo", "kodigopro", "support", "help", "moderator", "mod", "mods", "staff", "official", "team", "security", "safety",
  "system", "root", "null", "undefined", "anonymous", "everyone", "here", "me", "you", "settings", "login", "logout", "signup", "signin", "account", "api",
  "app", "pro", "u", "user", "users", "members", "lists", "list", "calendar", "tracker", "movies", "shows", "browse", "search", "notifications", "privacy",
  "terms", "about", "whats-new", "moderation", "preview", "tmdb", "tvmaze", "stripe",
]);

const LEET: Record<string, string> = { "0": "o", "1": "i", "!": "i", "|": "i", "3": "e", "4": "a", "@": "a", "5": "s", $: "s", "7": "t", "8": "b", "9": "g", "+": "t" };

/** Lower case, accents off, look-alike digits and symbols to letters, and
    runs of a letter squeezed to one or two ("fagggot" → "faggot"). */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0-9!|@$+]/g, (c) => LEET[c] ?? c)
    .replace(/(.)\1{2,}/g, "$1$1");
}

const ENDINGS = "(?:s|es|z|ed|ing|y)?";
const wordRe = (words: string[]) => new RegExp(`(?:^|[^a-z])(?:${words.join("|")})${ENDINGS}(?=$|[^a-z])`);
const SLUR_RE = wordRe(SLURS);
const NAME_RE = wordRe([...SLURS, ...NAME_ONLY]);

/** Joins letters split up with dots, dashes or spaces ("f.a.g", "f a g") so
    they're read as one word. */
function joinSpelled(text: string): string {
  return text.replace(/\b(?:[a-z][\s._\-*]){2,}[a-z]\b/g, (m) => m.replace(/[\s._\-*]/g, ""));
}

const MESSAGE = "That includes a word Kodigo doesn't allow. Please reword it.";

/** For anything people write: null if it's fine, else what to tell them. */
export function checkText(text: string): string | null {
  const n = normalise(text);
  return SLUR_RE.test(n) || SLUR_RE.test(joinSpelled(n)) ? MESSAGE : null;
}

/** For a display name: stricter, as it goes everywhere the person does. */
export function checkName(name: string): string | null {
  const n = normalise(name);
  return NAME_RE.test(n) || NAME_RE.test(joinSpelled(n)) ? "That name includes a word Kodigo doesn't allow." : null;
}

/** For a username: its shape, the reserved names, and the word lists, also
    inside the name since it has no spaces to split on. */
export function checkUsername(username: string): string | null {
  const u = username.toLowerCase();
  if (!/^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/.test(u)) return "Use 3 to 20 letters, numbers, dots or underscores, starting and ending with a letter or number.";
  if (/[._]{2}/.test(u)) return "No two dots or underscores in a row.";
  if (RESERVED.has(u)) return "That username is reserved.";
  const n = normalise(u).replace(/[._]/g, "");
  if (INSIDE.some((w) => n.includes(w)) || NAME_RE.test(normalise(u).replace(/[._]/g, " "))) return "That username isn't allowed.";
  return null;
}
