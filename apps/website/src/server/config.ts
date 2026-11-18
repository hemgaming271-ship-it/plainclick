import "server-only";

/** Read on every call so tests can change process.env between cases. Throws on missing required secrets. */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}`);
  return v;
}

function b64(name: string, minBytes: number): Buffer {
  const buf = Buffer.from(required(name), "base64");
  if (buf.length < minBytes) throw new Error(`${name} must decode to at least ${minBytes} bytes`);
  return buf;
}

export const isProduction = () => process.env.NODE_ENV === "production";

export const config = {
  licencePepper: () => b64("LICENCE_KEY_PEPPER_B64", 32),
  dataKey: () => {
    const k = b64("DATA_ENCRYPTION_KEY_B64", 32);
    if (k.length !== 32) throw new Error("DATA_ENCRYPTION_KEY_B64 must be exactly 32 bytes");
    return k;
  },
  rateLimitSalt: () => b64("RATE_LIMIT_SALT_B64", 32),
  entitlementPrivateKeyPem: () => Buffer.from(required("ENTITLEMENT_PRIVATE_KEY_B64"), "base64").toString("utf8"),
  paymentProvider: () => (process.env.PAYMENT_PROVIDER ?? "mock") as "dodo" | "paddle" | "mock",
  dodo: () => ({
    env: (process.env.DODO_ENV === "live" ? "live" : "test") as "test" | "live",
    apiKey: process.env.DODO_API_KEY ?? "",
    webhookSecret: required("DODO_WEBHOOK_SECRET"),
    productId: required("DODO_PRODUCT_ID"),
  }),
  paddle: () => ({
    env: (process.env.PADDLE_ENV ?? "sandbox") as "sandbox" | "production",
    apiKey: process.env.PADDLE_API_KEY ?? "",
    webhookSecret: required("PADDLE_WEBHOOK_SECRET"),
  }),
  mockWebhookSecret: () => required("MOCK_WEBHOOK_SECRET"),
  expected: () => ({
    // The one product/price a paid webhook may contain (Dodo product id, or Paddle price id).
    priceId:
      process.env.PAYMENT_PROVIDER === "dodo" ? required("DODO_PRODUCT_ID") : required("PADDLE_PRICE_ID"),
    currency: process.env.EXPECTED_CURRENCY ?? "USD",
    subtotalMinor: Number(process.env.EXPECTED_SUBTOTAL_MINOR ?? "599"),
  }),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  emailProvider: () => (process.env.EMAIL_PROVIDER ?? "console") as "resend" | "console",
  resendApiKey: () => required("RESEND_API_KEY"),
  emailFrom: () => required("EMAIL_FROM"),
  supportEmail: () => process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.invalid",
  cronSecret: () => required("CRON_SECRET"),
};
