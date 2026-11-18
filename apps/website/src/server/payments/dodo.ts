import "server-only";
import { createHmac } from "node:crypto";
import { safeEqual } from "../crypto";
import { type PaymentEvent, type PaymentProvider, WebhookVerificationError } from "./types";

/**
 * Dodo Payments adapter (merchant of record).
 *
 * Written from Dodo's published docs (checked 2026-11-18):
 *  - Webhooks follow the Standard Webhooks spec: headers `webhook-id`, `webhook-timestamp` (unix seconds),
 *    `webhook-signature` ("v1,<base64>" entries, space-separated). Signed content: `${id}.${timestamp}.${rawBody}`,
 *    HMAC-SHA256 keyed with base64-decode(secret without the "whsec_" prefix).
 *  - Envelope: { business_id, type, timestamp, data }. Events used: payment.succeeded, refund.succeeded.
 *  - Payment data: payment_id, status, currency, total_amount (smallest unit, INCLUDING tax), tax, product_cart
 *    [{ product_id, quantity }], customer { customer_id, email }, discounts / discount_id.
 *  - Refund data: refund_id, payment_id, status, is_partial, amount.
 * VERIFY BEFORE GO-LIVE: capture one real test-mode delivery of each event and compare with mapDodoEvent().
 * If a field is missing, the safe outcome is "needs_review" (no licence is issued), never a wrong licence.
 */
export function dodoProvider(opts: {
  webhookSecret: string;
  apiKey: string;
  env: "test" | "live";
  toleranceSeconds?: number;
  fetchImpl?: typeof fetch;
}): PaymentProvider & { createCheckout(input: { productId: string; returnUrl: string }): Promise<string> } {
  const tolerance = opts.toleranceSeconds ?? 300;
  const apiBase = dodoApiBase(opts.env);
  const key = dodoSigningKey(opts.webhookSecret);
  const f = () => opts.fetchImpl ?? fetch;

  return {
    name: "dodo",

    verifyAndParse(rawBody, headers, now = new Date()) {
      const id = headers.get("webhook-id");
      const ts = headers.get("webhook-timestamp");
      const sigHeader = headers.get("webhook-signature");
      if (!id || !ts || !sigHeader) throw new WebhookVerificationError("missing signature headers");
      const tsNum = Number(ts);
      if (!/^\d+$/.test(ts) || !Number.isFinite(tsNum)) throw new WebhookVerificationError("malformed timestamp");
      if (Math.abs(now.getTime() / 1000 - tsNum) > tolerance) throw new WebhookVerificationError("stale signature");

      const expected = createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest("base64");
      const ok = sigHeader
        .split(" ")
        .map((s) => s.trim())
        .filter((s) => s.startsWith("v1,"))
        .some((s) => safeEqual(s.slice(3), expected));
      if (!ok) throw new WebhookVerificationError("bad signature");

      let body: any;
      try {
        body = JSON.parse(rawBody);
      } catch {
        throw new WebhookVerificationError("invalid JSON");
      }
      // webhook-id is the stable per-event id (retries reuse it), so it's the idempotency key.
      return mapDodoEvent(body, id);
    },

    async getCustomerEmail(customerId) {
      if (!opts.apiKey) return null;
      const res = await f()(`${apiBase}/customers/${encodeURIComponent(customerId)}`, {
        headers: { Authorization: `Bearer ${opts.apiKey}` },
      });
      if (!res.ok) throw new Error(`Dodo customer lookup failed: HTTP ${res.status}`);
      const json: any = await res.json();
      return typeof json?.email === "string" ? json.email : null;
    },

    /** Creates a single-use hosted checkout session for exactly one copy of the product. Returns its URL. */
    async createCheckout({ productId, returnUrl }) {
      if (!opts.apiKey) throw new Error("DODO_API_KEY is not set");
      const res = await f()(`${apiBase}/checkouts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ product_cart: [{ product_id: productId, quantity: 1 }], return_url: returnUrl }),
      });
      if (!res.ok) throw new Error(`Dodo checkout session failed: HTTP ${res.status}`);
      const json: any = await res.json();
      const url = json?.checkout_url;
      if (typeof url !== "string" || !/^https:\/\//.test(url)) throw new Error("Dodo checkout session returned no checkout_url");
      return url;
    },
  };
}

export const dodoApiBase = (env: "test" | "live") => (env === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com");

/** Standard Webhooks: strip "whsec_" and base64-decode. */
export function dodoSigningKey(secret: string): Buffer {
  const s = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const key = Buffer.from(s, "base64");
  if (key.length < 16) throw new Error("DODO_WEBHOOK_SECRET doesn't look like a Dodo webhook secret (whsec_…)");
  return key;
}

export function mapDodoEvent(body: any, webhookId: string): PaymentEvent {
  const eventType = String(body?.type ?? "");
  const occurredAt = typeof body?.timestamp === "string" ? body.timestamp : null;
  const d = body?.data ?? {};
  const eventId = String(webhookId ?? "");
  if (!eventId || !eventType) throw new WebhookVerificationError("missing event id/type");

  if (eventType === "payment.succeeded") {
    if (d.status != null && d.status !== "succeeded") return { kind: "ignored", eventId, eventType, occurredAt };
    const total = Number(d.total_amount ?? NaN);
    const tax = d.tax == null ? 0 : Number(d.tax);
    const hasDiscount = (Array.isArray(d.discounts) && d.discounts.length > 0) || (d.discount_id != null && d.discount_id !== "");
    return {
      kind: "payment_completed",
      eventId,
      eventType,
      occurredAt,
      txnId: String(d.payment_id ?? ""),
      customerId: typeof d.customer?.customer_id === "string" ? d.customer.customer_id : null,
      customerEmail: typeof d.customer?.email === "string" ? d.customer.email : null,
      items: Array.isArray(d.product_cart)
        ? d.product_cart.map((it: any) => ({ priceId: String(it?.product_id ?? ""), quantity: Number(it?.quantity ?? 0) }))
        : [],
      currency: String(d.currency ?? ""),
      // Pre-tax amount, so it compares with EXPECTED_SUBTOTAL_MINOR wherever the buyer lives.
      subtotalMinor: total - tax,
      // Dodo reports discounts as codes, not amounts here: any discount sends the order to manual review.
      discountMinor: hasDiscount ? Number.NaN : 0,
    };
  }

  if (eventType === "refund.succeeded") {
    return {
      kind: "refund",
      eventId,
      eventType,
      occurredAt,
      txnId: String(d.payment_id ?? ""),
      approved: (d.status ?? "succeeded") === "succeeded",
      full: d.is_partial === false,
    };
  }

  return { kind: "ignored", eventId, eventType, occurredAt };
}
