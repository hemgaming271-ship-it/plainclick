import "server-only";
import { config, isProduction } from "../config";
import { dodoProvider } from "./dodo";
import { paddleProvider } from "./paddle";
import type { PaymentProvider } from "./types";

/**
 * DEVELOPMENT MOCK: same wire format as Paddle but signed with MOCK_WEBHOOK_SECRET, and the customer email is read
 * from the mock customer id ("ctm_mock_<base64url(email)>"). Refused in production.
 */
function mockProvider(): PaymentProvider {
  if (isProduction()) throw new Error("PAYMENT_PROVIDER=mock is not allowed in production");
  const inner = paddleProvider({ webhookSecret: config.mockWebhookSecret(), apiKey: "", env: "sandbox", name: "mock" });
  return {
    ...inner,
    async getCustomerEmail(customerId) {
      if (!customerId.startsWith("ctm_mock_")) return null;
      return Buffer.from(customerId.slice("ctm_mock_".length), "base64url").toString("utf8");
    },
  };
}

export function getDodo() {
  const d = config.dodo();
  return dodoProvider({ webhookSecret: d.webhookSecret, apiKey: d.apiKey, env: d.env });
}

export function getPaymentProvider(): PaymentProvider {
  const p = config.paymentProvider();
  if (p === "dodo") return getDodo();
  if (p === "paddle") {
    const c = config.paddle();
    return paddleProvider({ webhookSecret: c.webhookSecret, apiKey: c.apiKey, env: c.env });
  }
  return mockProvider();
}
