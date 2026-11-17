import { z } from "zod";
import { getDb } from "@/server/db";
import { badRequest, ipAllowed, json, parseJson, tooMany } from "@/server/http";
import { LIMITS } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ email: z.email().max(254), consent: z.literal(true) });

export async function POST(req: Request) {
  const db = getDb();
  if (!(await ipAllowed(db, req, "waitlist-ip", LIMITS.waitlistIp))) return tooMany();
  const body = await parseJson(req, Body);
  if (!body) return badRequest();
  await db.query(`INSERT INTO waitlist (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`, [body.email.trim().toLowerCase()]);
  return json({ message: "Thanks — we'll email you once when the beta opens. Nothing else." });
}
