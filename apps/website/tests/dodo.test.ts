import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { makeDb, setTestEnv } from "./support/setup";
import type { Db } from "@/server/db";

setTestEnv();
const SECRET = "whsec_" + randomBytes(24).toString("base64");
const PRODUCT = "pdt_test_plainclick";
Object.assign(process.env, {
  PAYMENT_PROVIDER: "dodo",
  DODO_ENV: "test",
  DODO_WEBHOOK_SECRET: SECRET,
  DODO_PRODUCT_ID: PRODUCT,
  DODO_API_KEY: "",
});

const { handleWebhook } = await import("@/server/fulfilment");
const { getPaymentProvider } = await import("@/server/payments");
const { dodoProvider } = await import("@/server/payments/dodo");
const { processDueEmailJobs } = await import("@/server/email");

let db: Db;
beforeEach(async () => {
  ({ db } = await makeDb());
});
const count = async (sql: string) => Number((await db.query(sql)).rows[0].c);

/** Signs exactly like Standard Webhooks / Dodo: base64(HMAC-SHA256(key, `${id}.${ts}.${body}`)). */
function sign(body: string, opts: { id?: string; ts?: number; secret?: string } = {}) {
  const id = opts.id ?? `msg_${randomUUID()}`;
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const key = Buffer.from((opts.secret ?? SECRET).slice("whsec_".length), "base64");
  const sig = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
  return new Headers({ "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${sig}` });
}

let n = 0;
function paymentSucceeded(over: Partial<{ paymentId: string; product: string; quantity: number; currency: string; total: number; tax: number | null; discountId: string; email: string; status: string }> = {}) {
  n++;
  return JSON.stringify({
    business_id: "bus_test",
    type: "payment.succeeded",
    timestamp: new Date().toISOString(),
    data: {
      payload_type: "Payment",
      payment_id: over.paymentId ?? `pay_${n}`,
      status: over.status ?? "succeeded",
      currency: over.currency ?? "USD",
      total_amount: over.total ?? 599,
      tax: over.tax === undefined ? 0 : over.tax,
      product_cart: [{ product_id: over.product ?? PRODUCT, quantity: over.quantity ?? 1 }],
      customer: { customer_id: `cus_${n}`, email: over.email ?? "buyer@example.com", name: "Buyer" },
      discount_id: over.discountId ?? null,
    },
  });
}
function refundSucceeded(paymentId: string, isPartial = false) {
  n++;
  return JSON.stringify({
    business_id: "bus_test",
    type: "refund.succeeded",
    timestamp: new Date().toISOString(),
    data: { payload_type: "Refund", refund_id: `ref_${n}`, payment_id: paymentId, status: "succeeded", is_partial: isPartial, amount: 599, currency: "USD" },
  });
}
const send = (body: string, headers = sign(body)) => handleWebhook(db, getPaymentProvider(), body, headers);

describe("Dodo webhook signature (Standard Webhooks)", () => {
  it("accepts a correctly signed delivery", async () => {
    expect((await send(paymentSucceeded())).outcome).toMatch(/^fulfilled/);
  });

  it("rejects missing headers, a wrong secret, an altered body, a stale timestamp and non-v1 signatures", async () => {
    const body = paymentSucceeded();
    expect((await send(body, new Headers())).httpStatus).toBe(401);
    expect((await send(body, sign(body, { secret: "whsec_" + randomBytes(24).toString("base64") }))).httpStatus).toBe(401);
    expect((await send(body.replace('"total_amount":599', '"total_amount":1'), sign(body))).httpStatus).toBe(401);
    expect((await send(body, sign(body, { ts: Math.floor(Date.now() / 1000) - 3600 }))).httpStatus).toBe(401);
    const h = sign(body);
    h.set("webhook-signature", h.get("webhook-signature")!.replace("v1,", "v2,"));
    expect((await send(body, h)).httpStatus).toBe(401);
    expect(await count(`SELECT count(*) c FROM purchases`)).toBe(0);
  });

  it("accepts when ANY of several space-separated v1 signatures matches (secret rotation)", async () => {
    const body = paymentSucceeded();
    const h = sign(body);
    h.set("webhook-signature", `v1,${randomBytes(32).toString("base64")} ${h.get("webhook-signature")}`);
    expect((await send(body, h)).outcome).toMatch(/^fulfilled/);
  });
});

describe("Dodo purchase → licence", () => {
  it("issues one licence, emails the buyer, and treats a redelivery (same webhook-id) as a duplicate", async () => {
    const body = paymentSucceeded({ paymentId: "pay_dup", email: "dodo-buyer@example.com" });
    const h = sign(body, { id: "msg_fixed" });
    expect((await send(body, h)).outcome).toMatch(/^fulfilled/);
    expect(await send(body, sign(body, { id: "msg_fixed" }))).toMatchObject({ duplicate: true });
    expect((await send(paymentSucceeded({ paymentId: "pay_dup" }))).outcome).toBe("already_fulfilled");
    expect(await count(`SELECT count(*) c FROM licences`)).toBe(1);

    const sent: any[] = [];
    await processDueEmailJobs(db, { async send(e: any) { sent.push(e); } }, getPaymentProvider());
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("dodo-buyer@example.com");
    expect(sent[0].text).toMatch(/PLCK(-[0-9A-Z]{4}){6}/);
  });

  it("compares the PRE-TAX amount, so buyers who pay sales tax/VAT still get their licence", async () => {
    expect((await send(paymentSucceeded({ total: 719, tax: 120 }))).outcome).toMatch(/^fulfilled/);
    expect((await send(paymentSucceeded({ total: 599, tax: null }))).outcome).toMatch(/^fulfilled/);
  });

  it.each([
    ["another product", { product: "pdt_other" }, "wrong_price_id"],
    ["local currency (adaptive pricing)", { currency: "INR", total: 52000 }, "currency=INR"],
    ["wrong amount", { total: 100 }, "subtotal=100"],
    ["a discount code", { discountId: "dsc_123" }, "discount_applied"],
    ["quantity 2", { quantity: 2 }, "quantity=2"],
  ])("sends %s to manual review without a licence", async (_name, over, reason) => {
    const r = await send(paymentSucceeded(over as any));
    expect(r.outcome).toContain("needs_review");
    expect(r.outcome).toContain(reason);
    expect(await count(`SELECT count(*) c FROM licences`)).toBe(0);
  });

  it("ignores a payment.succeeded whose status isn't succeeded, and unrelated events", async () => {
    expect((await send(paymentSucceeded({ status: "processing" }))).outcome).toBe("ignored:payment.succeeded");
    const other = JSON.stringify({ business_id: "b", type: "payment.failed", timestamp: new Date().toISOString(), data: {} });
    expect((await send(other)).outcome).toBe("ignored:payment.failed");
    expect(await count(`SELECT count(*) c FROM licences`)).toBe(0);
  });

  it("revokes on a full refund; a partial refund does not revoke", async () => {
    await send(paymentSucceeded({ paymentId: "pay_r" }));
    expect((await send(refundSucceeded("pay_r", true))).outcome).toBe("partial_refund_recorded_no_revoke");
    expect((await send(refundSucceeded("pay_r"))).outcome).toBe("refunded_licence_revoked");
    expect((await db.query(`SELECT status FROM licences`)).rows[0].status).toBe("revoked");
  });

  it("never issues a licence when the refund arrives before the payment", async () => {
    expect((await send(refundSucceeded("pay_early"))).outcome).toBe("refunded_before_fulfilment");
    expect((await send(paymentSucceeded({ paymentId: "pay_early" }))).outcome).toBe("payment_after_refund_no_licence");
    expect(await count(`SELECT count(*) c FROM licences`)).toBe(0);
  });
});

describe("Dodo API calls", () => {
  it("creates a single-item checkout session with the secret key server-side and returns its URL", async () => {
    const calls: { url: string; init: any }[] = [];
    const fetchImpl = (async (url: string, init: any) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ session_id: "cks_1", checkout_url: "https://checkout.dodopayments.com/session/cks_1" }));
    }) as any;
    const p = dodoProvider({ webhookSecret: SECRET, apiKey: "sk_test_x", env: "test", fetchImpl });
    const url = await p.createCheckout({ productId: PRODUCT, returnUrl: "https://plainclick.test/thanks" });
    expect(url).toBe("https://checkout.dodopayments.com/session/cks_1");
    expect(calls[0].url).toBe("https://test.dodopayments.com/checkouts");
    expect(calls[0].init.headers.Authorization).toBe("Bearer sk_test_x");
    expect(JSON.parse(calls[0].init.body)).toEqual({ product_cart: [{ product_id: PRODUCT, quantity: 1 }], return_url: "https://plainclick.test/thanks" });

    const live = dodoProvider({ webhookSecret: SECRET, apiKey: "k", env: "live", fetchImpl });
    await live.createCheckout({ productId: PRODUCT, returnUrl: "https://x.test/thanks" });
    expect(calls[1].url).toBe("https://live.dodopayments.com/checkouts");
  });

  it("fails safely when Dodo returns an error or no checkout URL", async () => {
    const bad = dodoProvider({ webhookSecret: SECRET, apiKey: "k", env: "test", fetchImpl: (async () => new Response("{}", { status: 500 })) as any });
    await expect(bad.createCheckout({ productId: PRODUCT, returnUrl: "https://x.test" })).rejects.toThrow(/HTTP 500/);
    const empty = dodoProvider({ webhookSecret: SECRET, apiKey: "k", env: "test", fetchImpl: (async () => new Response("{}")) as any });
    await expect(empty.createCheckout({ productId: PRODUCT, returnUrl: "https://x.test" })).rejects.toThrow(/checkout_url/);
    const noKey = dodoProvider({ webhookSecret: SECRET, apiKey: "", env: "test" });
    await expect(noKey.createCheckout({ productId: PRODUCT, returnUrl: "https://x.test" })).rejects.toThrow(/DODO_API_KEY/);
  });

  it("rejects a webhook secret that isn't a Dodo whsec_ key", () => {
    expect(() => dodoProvider({ webhookSecret: "whsec_abc", apiKey: "", env: "test" })).toThrow(/whsec_/);
  });
});
