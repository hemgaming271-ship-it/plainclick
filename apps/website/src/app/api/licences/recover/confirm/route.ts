import { z } from "zod";
import { getDb } from "@/server/db";
import { badRequest, ipAllowed, json, parseJson, tooMany } from "@/server/http";
import { confirmRecovery } from "@/server/licensing";
import { LIMITS } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ token: z.string().min(20).max(128), resetActivations: z.boolean() });

export async function POST(req: Request) {
  const db = getDb();
  if (!(await ipAllowed(db, req, "recover-confirm-ip", LIMITS.recoverConfirmIp))) return tooMany();
  const body = await parseJson(req, Body);
  if (!body) return badRequest();
  const r = await confirmRecovery(db, body.token, body.resetActivations);
  if (r.status !== "ok") return json({ status: r.status, message: "This link has expired or was already used. Request a new one." }, 410);
  return json(r);
}
