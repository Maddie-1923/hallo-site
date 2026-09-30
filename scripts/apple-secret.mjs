// Makes the "Secret Key (for OAuth)" Supabase asks for under Sign in with
// Apple: a token signed with the .p8 key from the Apple Developer portal,
// valid for Apple's maximum of six months. It goes straight to the clipboard
// and is never printed, so the key and the secret stay on this Mac.
//
//   node scripts/apple-secret.mjs <path to AuthKey_XXXX.p8> <Team ID> <Key ID> <Services ID>
//
// Run it again before the date it prints, and paste the new one into
// Supabase (every project that uses Apple), or Apple sign-in stops working.
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [file, team, keyID, servicesID] = process.argv.slice(2);
if (!file || !team || !keyID || !servicesID) {
  console.error("Usage: node scripts/apple-secret.mjs <AuthKey_XXXX.p8> <Team ID> <Key ID> <Services ID>");
  process.exit(1);
}
const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const expires = now + 180 * 24 * 3600 - 3600; // just under six months
const head = b64({ alg: "ES256", kid: keyID.trim() });
const body = b64({ iss: team.trim(), iat: now, exp: expires, aud: "https://appleid.apple.com", sub: servicesID.trim() });
const key = createPrivateKey(readFileSync(file.replace(/^~/, process.env.HOME), "utf8"));
const signature = sign("sha256", Buffer.from(`${head}.${body}`), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
execFileSync("pbcopy", { input: `${head}.${body}.${signature}` });
console.log(`Copied to the clipboard. Paste it into Supabase → Authentication → Sign In / Providers → Apple → Secret Key.`);
console.log(`It stops working on ${new Date(expires * 1000).toDateString()}: make a new one before then.`);
