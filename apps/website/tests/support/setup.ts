import { PGlite } from "@electric-sql/pglite";
import { createHmac, generateKeyPairSync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Db, Queryable } from "@/server/db";

/** Real PostgreSQL (compiled to WASM) per test file. Single connection: concurrent transactions are serialised. */
export async function makeDb(): Promise<{ db: Db; pg: PGlite }> {
  const pg = new PGlite();
  const here = path.dirname(fileURLToPath(import.meta.url));
  await pg.exec(readFileSync(path.join(here, "..", "..", "db", "migrations", "001_init.sql"), "utf8"));
  const wrap = (x: { query: PGlite["query"] }): Queryable => ({
    async query(sql, params) {
      const r = await x.query(sql, params as any[]);
      return { rows: r.rows as any[] };
    },
  });
  const db: Db = {
    ...wrap(pg),
    tx: (fn) => pg.transaction((t) => fn(wrap(t as any))),
  };
  return { db, pg };
}

export const MOCK_SECRET = "test-webhook-secret";
export const PRICE_ID = "pri_test_plainclick_v1";

export function setTestEnv() {
  const { privateKey } = generateKeyPairSync("ed25519");
  Object.assign(process.env, {
    ENTITLEMENT_PRIVATE_KEY_B64: Buffer.from(privateKey.export({ type: "pkcs8", format: "pem" })).toString("base64"),
    LICENCE_KEY_PEPPER_B64: randomBytes(32).toString("base64"),
    DATA_ENCRYPTION_KEY_B64: randomBytes(32).toString("base64"),
    RATE_LIMIT_SALT_B64: randomBytes(32).toString("base64"),
    PADDLE_PRICE_ID: PRICE_ID,
    EXPECTED_CURRENCY: "USD",
    EXPECTED_SUBTOTAL_MINOR: "599",
    MOCK_WEBHOOK_SECRET: MOCK_SECRET,
    PAYMENT_PROVIDER: "mock",
    NEXT_PUBLIC_SITE_URL: "https://plainclick.test",
  });
}

export function signedHeaders(body: string, secret = MOCK_SECRET, ts = Math.floor(Date.now() / 1000)): Headers {
  const h1 = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return new Headers({ "paddle-signature": `ts=${ts};h1=${h1}` });
}

let n = 0;
export function txnCompleted(over: Partial<{ eventId: string; txnId: string; priceId: string; currency: string; subtotal: string; discount: string; email: string; quantity: number }> = {}) {
  n++;
  const email = over.email ?? "buyer@example.com";
  return JSON.stringify({
    event_id: over.eventId ?? `evt_${n}_${randomBytes(4).toString("hex")}`,
    event_type: "transaction.completed",
    occurred_at: new Date().toISOString(),
    data: {
      id: over.txnId ?? `txn_${n}`,
      status: "completed",
      customer_id: "ctm_mock_" + Buffer.from(email).toString("base64url"),
      currency_code: over.currency ?? "USD",
      items: [{ price: { id: over.priceId ?? PRICE_ID }, quantity: over.quantity ?? 1 }],
      details: { totals: { subtotal: over.subtotal ?? "599", discount: over.discount ?? "0", tax: "0", total: over.subtotal ?? "599" } },
    },
  });
}

export function refundEvent(txnId: string, over: Partial<{ eventId: string; type: string; status: string }> = {}) {
  n++;
  return JSON.stringify({
    event_id: over.eventId ?? `evt_r${n}`,
    event_type: "adjustment.created",
    occurred_at: new Date().toISOString(),
    data: { id: `adj_${n}`, action: "refund", status: over.status ?? "approved", type: over.type ?? "full", transaction_id: txnId },
  });
}
