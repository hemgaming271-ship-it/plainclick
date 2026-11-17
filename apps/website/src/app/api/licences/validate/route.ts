import { z } from "zod";
import { getDb } from "@/server/db";
import { badRequest, ipAllowed, json, parseJson, tooMany } from "@/server/http";
import { validate } from "@/server/licensing";
import { LIMITS } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ entitlement: z.string().min(10).max(2048), installationId: z.uuid() });

export async function POST(req: Request) {
  const db = getDb();
  if (!(await ipAllowed(db, req, "validate-ip", LIMITS.validateIp))) return tooMany();
  const body = await parseJson(req, Body);
  if (!body) return badRequest();
  return json({ status: await validate(db, body) });
}
