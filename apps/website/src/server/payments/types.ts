/**
 * Provider-neutral payment events. Each provider adapter verifies the signature on the ORIGINAL raw body and maps
 * its own payload into one of these. Business logic (fulfilment.ts) never sees provider-specific JSON.
 */
export type PaymentEvent =
  | {
      kind: "payment_completed";
      eventId: string;
      eventType: string;
      occurredAt: string | null;
      txnId: string;
      customerId: string | null;
      customerEmail: string | null;
      items: { priceId: string; quantity: number }[];
      currency: string;
      subtotalMinor: number;
      discountMinor: number;
    }
  | {
      kind: "refund";
      eventId: string;
      eventType: string;
      occurredAt: string | null;
      txnId: string;
      approved: boolean;
      full: boolean;
    }
  | { kind: "ignored"; eventId: string; eventType: string; occurredAt: string | null };

export class WebhookVerificationError extends Error {}

export interface PaymentProvider {
  readonly name: string;
  /** Throws WebhookVerificationError if the signature is missing, invalid, or too old. */
  verifyAndParse(rawBody: string, headers: Headers, now?: Date): PaymentEvent;
  /** Resolves the buyer's email for licence delivery (webhook payloads may only carry a customer id). */
  getCustomerEmail(customerId: string): Promise<string | null>;
}
