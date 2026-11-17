import "server-only";
import type { z } from "zod";
import type { Db } from "./db";
import { allow, bucketId, clientIp } from "./rateLimit";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const tooMany = () => json({ error: "rate_limited", message: "Too many requests. Please wait and try again." }, 429);
export const badRequest = () => json({ error: "bad_request" }, 400);

export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | null> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > 16_384) return null;
  try {
    const r = schema.safeParse(await req.json());
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export async function ipAllowed(db: Db, req: Request, scope: string, [limit, window]: readonly [number, number]) {
  return allow(db, bucketId(scope, clientIp(req.headers)), limit, window);
}
