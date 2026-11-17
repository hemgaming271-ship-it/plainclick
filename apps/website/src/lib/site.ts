/** Public site state. Everything that could make a false claim is driven from here. */
export const site = {
  name: "PlainClick",
  tagline: "Clear controls. Less clutter.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.invalid",
  sellerName: process.env.NEXT_PUBLIC_SELLER_NAME ?? "[Seller legal name]",
  releaseAvailable: process.env.NEXT_PUBLIC_RELEASE_AVAILABLE === "true",
  release: {
    version: process.env.NEXT_PUBLIC_RELEASE_VERSION ?? "",
    downloadUrl: process.env.NEXT_PUBLIC_DOWNLOAD_URL ?? "",
    sha256: process.env.NEXT_PUBLIC_RELEASE_SHA256 ?? "",
    minimumMacOS: process.env.NEXT_PUBLIC_RELEASE_MIN_MACOS ?? "macOS 14 Sonoma",
  },
  // Live checkout needs BOTH flags: never sell before a working download exists.
  checkoutEnabled: process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true" && process.env.NEXT_PUBLIC_RELEASE_AVAILABLE === "true",
  paddle: {
    clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "",
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID ?? "",
    env: (process.env.PADDLE_ENV === "production" ? "production" : "sandbox") as "production" | "sandbox",
  },
  price: "US$5.99",
  licenceSummary:
    "$5.99 one time. A perpetual personal licence for PlainClick v1, including all v1 updates, on up to two Macs you own. No recurring subscription. Future paid major versions are optional.",
};

export const nav = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/compatibility", label: "Compatibility" },
  { href: "/pricing", label: "Pricing" },
  { href: "/help", label: "Help" },
];

export const footerNav = [
  { href: "/download", label: "Download" },
  { href: "/changelog", label: "Changelog" },
  { href: "/recover", label: "Recover licence" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms & licence" },
  { href: "/refunds", label: "Refunds" },
  { href: "/contact", label: "Contact" },
];
