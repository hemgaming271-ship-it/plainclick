import { getDb } from "@/server/db";
import { getMailer, processDueEmailJobs } from "@/server/email";
import { handleWebhook } from "@/server/fulfilment";
import { json } from "@/server/http";
import { getPaymentProvider } from "@/server/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // The signature covers the exact bytes, so read the raw body before any parsing.
  const raw = await req.text();
  const db = getDb();
  const provider = getPaymentProvider();
  const result = await handleWebhook(db, provider, raw, req.headers);
  if (result.httpStatus === 401) return json({ error: "invalid_signature" }, 401);

  // Best-effort immediate delivery. If it fails, the cron runner retries from the durable outbox.
  if (result.outcome.startsWith("fulfilled")) {
    processDueEmailJobs(db, getMailer(), provider, 5).catch((e) => console.error("email job run failed:", e?.message));
  }
  // Log the outcome only — never the body (it contains customer data).
  console.info(`webhook ${provider.name}: ${result.outcome}`);
  return json({ ok: true });
}
