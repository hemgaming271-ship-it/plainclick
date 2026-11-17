import { z } from "zod";
import { getDb } from "@/server/db";
import { badRequest, ipAllowed, json, parseJson, tooMany } from "@/server/http";
import { activate } from "@/server/licensing";
import { allow, bucketId, LIMITS } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  licenceKey: z.string().min(10).max(64),
  installationId: z.uuid(),
  appVersion: z.string().max(32).optional(),
  deviceLabel: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  const db = getDb();
  if (!(await ipAllowed(db, req, "activate-ip", LIMITS.activateIp))) return tooMany();
  const body = await parseJson(req, Body);
  if (!body) return badRequest();
  if (!(await allow(db, bucketId("activate-key", body.licenceKey.replace(/[^0-9a-z]/gi, "")), ...LIMITS.activateKey))) return tooMany();

  const r = await activate(db, body);
  switch (r.status) {
    case "activated":
      return json(r);
    case "invalid_key":
      return json({ status: r.status, message: "That licence key wasn't recognised. Check for typos." }, 404);
    case "revoked":
      return json({ status: r.status, message: "This licence is no longer active (for example, after a refund)." }, 403);
    case "limit_reached":
      return json({ ...r, message: "This licence is already active on two Macs. Deactivate one, or reset activations from the recovery page." }, 409);
  }
}
