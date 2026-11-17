import { config } from "@/server/config";
import { safeEqual } from "@/server/crypto";
import { getDb } from "@/server/db";
import { getMailer, processDueEmailJobs } from "@/server/email";
import { json } from "@/server/http";
import { getPaymentProvider } from "@/server/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Called by a scheduler (e.g. every 5 minutes) with Authorization: Bearer <CRON_SECRET>. */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${config.cronSecret()}`)) return json({ error: "unauthorised" }, 401);
  const results = await processDueEmailJobs(getDb(), getMailer(), getPaymentProvider(), 25);
  return json({ processed: results.length, sent: results.filter((r) => r.ok).length });
}
