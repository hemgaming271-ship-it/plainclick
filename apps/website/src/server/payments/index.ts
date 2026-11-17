import "server-only";
import { config, isProduction } from "../config";
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

export function getPaymentProvider(): PaymentProvider {
  if (config.paymentProvider() === "paddle") {
    const p = config.paddle();
    return paddleProvider({ webhookSecret: p.webhookSecret, apiKey: p.apiKey, env: p.env });
  }
  return mockProvider();
}
