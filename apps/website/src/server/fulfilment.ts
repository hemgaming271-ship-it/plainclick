import "server-only";
import { config } from "./config";
import { encrypt, generateLicenceKey, licenceKeyLookup, normaliseLicenceKey, randomId } from "./crypto";
import type { Db, Queryable } from "./db";
import { type PaymentEvent, type PaymentProvider, WebhookVerificationError } from "./payments/types";

export type WebhookResult =
  | { httpStatus: 401; outcome: "invalid_signature" }
  | { httpStatus: 200; outcome: string; duplicate: boolean };

/**
 * Verifies, records, and applies one webhook. Everything after verification happens in ONE transaction:
 * the event row, purchase row, licence and email job commit together or not at all, so a provider retry after a
 * crash re-processes cleanly, and a duplicate delivery is a no-op.
 */
export async function handleWebhook(db: Db, provider: PaymentProvider, rawBody: string, headers: Headers): Promise<WebhookResult> {
  let event: PaymentEvent;
  try {
    event = provider.verifyAndParse(rawBody, headers);
  } catch (e) {
    if (e instanceof WebhookVerificationError) return { httpStatus: 401, outcome: "invalid_signature" };
    throw e;
  }

  return db.tx(async (q) => {
    const ins = await q.query(
      `INSERT INTO webhook_events (provider, event_id, event_type, occurred_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider, event_id) DO NOTHING RETURNING id`,
      [provider.name, event.eventId, event.eventType, event.occurredAt],
    );
    if (ins.rows.length === 0) return { httpStatus: 200 as const, outcome: "duplicate_event", duplicate: true };

    const outcome = await apply(q, provider.name, event);
    await q.query(`UPDATE webhook_events SET processed_at = now(), outcome = $2 WHERE id = $1`, [ins.rows[0].id, outcome]);
    return { httpStatus: 200 as const, outcome, duplicate: false };
  });
}

async function lockPurchase(q: Queryable, provider: string, txnId: string) {
  await q.query(
    `INSERT INTO purchases (provider, provider_txn_id, status) VALUES ($1, $2, 'pending')
     ON CONFLICT (provider, provider_txn_id) DO NOTHING`,
    [provider, txnId],
  );
  const { rows } = await q.query(
    `SELECT p.*, l.id AS licence_id FROM purchases p LEFT JOIN licences l ON l.purchase_id = p.id
      WHERE p.provider = $1 AND p.provider_txn_id = $2 FOR UPDATE OF p`,
    [provider, txnId],
  );
  return rows[0];
}

async function apply(q: Queryable, providerName: string, event: PaymentEvent): Promise<string> {
  if (event.kind === "ignored") return `ignored:${event.eventType}`;
  if (!event.txnId) return "ignored:no_transaction_id";

  const purchase = await lockPurchase(q, providerName, event.txnId);

  if (event.kind === "refund") {
    if (!event.approved) return "refund_not_approved";
    if (!event.full) return "partial_refund_recorded_no_revoke";
    await q.query(`UPDATE purchases SET status = 'refunded', refunded_at = now(), updated_at = now() WHERE id = $1`, [purchase.id]);
    if (purchase.licence_id) {
      await q.query(
        `UPDATE licences SET status = 'revoked', revoked_reason = 'refund', revoked_at = now() WHERE id = $1 AND status = 'active'`,
        [purchase.licence_id],
      );
      return "refunded_licence_revoked";
    }
    return "refunded_before_fulfilment";
  }

  // payment_completed
  const exp = config.expected();
  await q.query(
    `UPDATE purchases SET provider_customer_id = COALESCE($2, provider_customer_id),
            customer_email = COALESCE($3, customer_email), price_id = $4, currency = $5, subtotal_minor = $6, updated_at = now()
      WHERE id = $1`,
    [purchase.id, event.customerId, event.customerEmail, event.items[0]?.priceId ?? null, event.currency,
     Number.isFinite(event.subtotalMinor) ? event.subtotalMinor : null],
  );

  if (purchase.status === "refunded") return "payment_after_refund_no_licence";
  if (purchase.licence_id) return "already_fulfilled";

  // Never trust anything but the verified provider payload, and check it against server configuration.
  const problems: string[] = [];
  if (event.items.length !== 1) problems.push(`item_count=${event.items.length}`);
  const item = event.items[0];
  if (item && item.priceId !== exp.priceId) problems.push("wrong_price_id");
  if (item && item.quantity !== 1) problems.push(`quantity=${item.quantity}`);
  if (event.currency !== exp.currency) problems.push(`currency=${event.currency}`);
  if (event.subtotalMinor !== exp.subtotalMinor) problems.push(`subtotal=${event.subtotalMinor}`);
  if (event.discountMinor !== 0) problems.push(`discount=${event.discountMinor}`);
  if (problems.length) {
    await q.query(`UPDATE purchases SET status = 'needs_review', review_reason = $2, updated_at = now() WHERE id = $1`, [
      purchase.id,
      problems.join(","),
    ]);
    return `needs_review:${problems.join(",")}`;
  }

  const key = generateLicenceKey();
  const normalised = normaliseLicenceKey(key)!;
  const lic = await q.query(
    `INSERT INTO licences (purchase_id, public_id, key_lookup, key_ciphertext) VALUES ($1, $2, $3, $4) RETURNING id`,
    [purchase.id, randomId(), licenceKeyLookup(normalised), encrypt(key)],
  );
  await q.query(`UPDATE purchases SET status = 'paid', paid_at = now(), updated_at = now() WHERE id = $1`, [purchase.id]);
  await q.query(
    `INSERT INTO email_jobs (kind, purchase_id, to_email, payload_ciphertext) VALUES ('licence_delivery', $1, $2, $3)`,
    [purchase.id, event.customerEmail, encrypt(JSON.stringify({ kind: "licence_delivery", licenceKey: key }))],
  );
  return `fulfilled:licence_${lic.rows[0].id}`;
}
