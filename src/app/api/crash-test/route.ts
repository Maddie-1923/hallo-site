import { notFound } from "next/navigation";
import { moderatorAccess } from "@/lib/safety-actions";

// A deliberate server error, so a moderator can check crash reports reach
// Sentry (the Moderation page's "Send a test crash"). Nobody else can reach it.
export async function POST() {
  if (!(await moderatorAccess())) notFound();
  throw new Error("Kodigo test crash from the server (sent on purpose from Moderation)");
}
