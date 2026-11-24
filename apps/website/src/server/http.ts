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

export const MAX_BODY_BYTES = 16_384;

/** Reads at most `max` bytes. Chunked bodies have no Content-Length, so the limit is enforced while streaming. */
export async function readBodyLimited(req: Request, max = MAX_BODY_BYTES): Promise<string | null> {
  const declared = req.headers.get("content-length");
  if (declared !== null && !(Number(declared) <= max)) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | null> {
  try {
    const text = await readBodyLimited(req);
    if (text === null) return null;
    const r = schema.safeParse(JSON.parse(text));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export async function ipAllowed(db: Db, req: Request, scope: string, [limit, window]: readonly [number, number]) {
  return allow(db, bucketId(scope, clientIp(req.headers)), limit, window);
}
