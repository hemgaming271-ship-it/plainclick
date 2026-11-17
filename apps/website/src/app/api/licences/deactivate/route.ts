import { z } from "zod";
import { getDb } from "@/server/db";
import { badRequest, ipAllowed, json, parseJson, tooMany } from "@/server/http";
import { deactivate } from "@/server/licensing";
import { LIMITS } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ licenceKey: z.string().min(10).max(64), installationId: z.uuid() });

export async function POST(req: Request) {
  const db = getDb();
  if (!(await ipAllowed(db, req, "deactivate-ip", LIMITS.deactivateIp))) return tooMany();
  const body = await parseJson(req, Body);
  if (!body) return badRequest();
  const r = await deactivate(db, body);
  return r === "ok" ? json({ status: "deactivated" }) : json({ status: "invalid_key" }, 404);
}
