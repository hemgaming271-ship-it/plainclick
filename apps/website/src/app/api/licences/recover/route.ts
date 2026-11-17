import { z } from "zod";
import { getDb } from "@/server/db";
import { getMailer, processDueEmailJobs } from "@/server/email";
import { badRequest, ipAllowed, json, parseJson, tooMany } from "@/server/http";
import { requestRecovery } from "@/server/licensing";
import { allow, bucketId, LIMITS } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ email: z.email().max(254) });
const GENERIC = {
  message: "If that email address has a PlainClick purchase, we've sent a recovery link. It expires in 30 minutes.",
};

export async function POST(req: Request) {
  const db = getDb();
  if (!(await ipAllowed(db, req, "recover-ip", LIMITS.recoverIp))) return tooMany();
  const body = await parseJson(req, Body);
  if (!body) return badRequest();
  // Over the per-email limit we still answer generically, so the response never reveals anything.
  if (await allow(db, bucketId("recover-email", body.email), ...LIMITS.recoverEmail)) {
    await requestRecovery(db, body.email);
    processDueEmailJobs(db, getMailer(), null, 5).catch((e) => console.error("email job run failed:", e?.message));
  }
  return json(GENERIC);
}
