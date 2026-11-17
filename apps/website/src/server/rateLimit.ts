import "server-only";
import { createHmac } from "node:crypto";
import { config } from "./config";
import type { Db } from "./db";

/** Hash identifiers (IP, email, key) so the rate-limit table never holds them in clear. */
export function bucketId(scope: string, value: string): string {
  return scope + ":" + createHmac("sha256", config.rateLimitSalt()).update(value.toLowerCase()).digest("hex").slice(0, 32);
}

/** Fixed-window counter. Returns true when the request is allowed. */
export async function allow(db: Db, bucket: string, limit: number, windowSeconds: number, now = new Date()): Promise<boolean> {
  const start = new Date(Math.floor(now.getTime() / 1000 / windowSeconds) * windowSeconds * 1000);
  const { rows } = await db.query<{ count: number }>(
    `INSERT INTO rate_limits (bucket, window_start, count) VALUES ($1, $2, 1)
     ON CONFLICT (bucket, window_start) DO UPDATE SET count = rate_limits.count + 1
     RETURNING count`,
    [bucket, start.toISOString()],
  );
  return Number(rows[0].count) <= limit;
}

/** Best-effort client IP. Behind a proxy/CDN, configure the host so x-forwarded-for is set by the proxy itself. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export const LIMITS = {
  activateIp: [20, 3600],
  activateKey: [10, 3600],
  validateIp: [120, 3600],
  deactivateIp: [20, 3600],
  recoverIp: [5, 3600],
  recoverEmail: [3, 3600],
  recoverConfirmIp: [10, 3600],
  waitlistIp: [5, 3600],
} as const satisfies Record<string, readonly [number, number]>;
