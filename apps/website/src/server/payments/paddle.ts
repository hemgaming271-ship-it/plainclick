import "server-only";
import { createHmac } from "node:crypto";
import { safeEqual } from "../crypto";
import { type PaymentEvent, type PaymentProvider, WebhookVerificationError } from "./types";

/**
 * Paddle Billing adapter.
 *
 * VERIFY BEFORE GO-LIVE against current Paddle docs + a sandbox webhook capture:
 *  - Signature header "Paddle-Signature: ts=<unix>;h1=<hex HMAC-SHA256(secret, `${ts}:${rawBody}`)>"
 *  - transaction.completed → data.id, data.customer_id, data.currency_code, data.items[].price.id / .quantity,
 *    data.details.totals.subtotal / .discount (strings, lowest currency unit)
 *  - adjustment.created / adjustment.updated → data.action === "refund", data.status, data.type ("full"|"partial"),
 *    data.transaction_id
 * Field names here are written from Paddle Billing's published API shape and have NOT yet been checked against a
 * live sandbox capture. tests/fixtures mirror these assumptions.
 */
export function paddleProvider(opts: {
  webhookSecret: string;
  apiKey: string;
  env: "sandbox" | "production";
  toleranceSeconds?: number;
  name?: string;
  fetchImpl?: typeof fetch;
}): PaymentProvider {
  const tolerance = opts.toleranceSeconds ?? 300;
  const apiBase = opts.env === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";

  return {
    name: opts.name ?? "paddle",

    verifyAndParse(rawBody, headers, now = new Date()) {
      const header = headers.get("paddle-signature");
      if (!header) throw new WebhookVerificationError("missing signature");
      const parts = Object.fromEntries(
        header.split(";").map((kv) => {
          const i = kv.indexOf("=");
          return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
        }),
      );
      const ts = Number(parts.ts);
      const h1 = parts.h1;
      if (!Number.isFinite(ts) || !h1) throw new WebhookVerificationError("malformed signature");
      if (Math.abs(now.getTime() / 1000 - ts) > tolerance) throw new WebhookVerificationError("stale signature");
      const expected = createHmac("sha256", opts.webhookSecret).update(`${parts.ts}:${rawBody}`).digest("hex");
      if (!safeEqual(expected, h1)) throw new WebhookVerificationError("bad signature");

      let body: any;
      try {
        body = JSON.parse(rawBody);
      } catch {
        throw new WebhookVerificationError("invalid JSON");
      }
      return mapPaddleEvent(body);
    },

    async getCustomerEmail(customerId) {
      if (!opts.apiKey) return null;
      const f = opts.fetchImpl ?? fetch;
      const res = await f(`${apiBase}/customers/${encodeURIComponent(customerId)}`, {
        headers: { Authorization: `Bearer ${opts.apiKey}` },
      });
      if (!res.ok) throw new Error(`Paddle customer lookup failed: HTTP ${res.status}`);
      const json: any = await res.json();
      return typeof json?.data?.email === "string" ? json.data.email : null;
    },
  };
}

export function mapPaddleEvent(body: any): PaymentEvent {
  const eventId = String(body?.event_id ?? "");
  const eventType = String(body?.event_type ?? "");
  const occurredAt = typeof body?.occurred_at === "string" ? body.occurred_at : null;
  const d = body?.data ?? {};
  if (!eventId || !eventType) throw new WebhookVerificationError("missing event id/type");

  if (eventType === "transaction.completed") {
    const totals = d?.details?.totals ?? {};
    return {
      kind: "payment_completed",
      eventId,
      eventType,
      occurredAt,
      txnId: String(d.id ?? ""),
      customerId: d.customer_id ?? null,
      customerEmail: typeof d.customer?.email === "string" ? d.customer.email : null,
      items: Array.isArray(d.items)
        ? d.items.map((it: any) => ({ priceId: String(it?.price?.id ?? it?.price_id ?? ""), quantity: Number(it?.quantity ?? 0) }))
        : [],
      currency: String(d.currency_code ?? ""),
      subtotalMinor: Number(totals.subtotal ?? NaN),
      discountMinor: Number(totals.discount ?? 0),
    };
  }
  if (eventType === "adjustment.created" || eventType === "adjustment.updated") {
    if (d.action === "refund") {
      return {
        kind: "refund",
        eventId,
        eventType,
        occurredAt,
        txnId: String(d.transaction_id ?? ""),
        approved: d.status === "approved",
        full: d.type === "full",
      };
    }
  }
  return { kind: "ignored", eventId, eventType, occurredAt };
}
