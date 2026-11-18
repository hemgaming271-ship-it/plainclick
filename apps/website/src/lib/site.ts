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
  /**
   * "static" (default, FREE): no server of ours. Static site; Buy = Dodo payment link; Dodo issues, emails and limits
   * licence keys; the app checks keys with Dodo directly. "server": our own Next.js API (webhooks, recovery, waitlist).
   */
  mode: (process.env.NEXT_PUBLIC_SITE_MODE === "server" ? "server" : "static") as "static" | "server",
  dodo: {
    // Copy the product's payment link from the Dodo dashboard, e.g. https://checkout.dodopayments.com/buy/pdt_…
    paymentLink: process.env.NEXT_PUBLIC_DODO_PAYMENT_LINK ?? "",
  },
  // Release notes / "watch releases" link (GitHub Releases host the free download).
  releasesUrl: process.env.NEXT_PUBLIC_RELEASES_URL ?? "https://github.com/hemgaming271-ship-it/plainclick/releases",
  // true only for a build that is Developer ID signed AND notarized by Apple.
  releaseNotarized: process.env.NEXT_PUBLIC_RELEASE_NOTARIZED === "true",
  // Server mode only. "dodo" → hosted checkout via POST /api/checkout.
  checkoutProvider: (process.env.PAYMENT_PROVIDER === "dodo" ? "dodo" : "paddle") as "dodo" | "paddle",
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
  { href: "/#features", label: "Features" },
  { href: "/compatibility", label: "Apps" },
  { href: "/#privacy", label: "Privacy" },
  { href: "/pricing", label: "Pricing" },
  { href: "/help", label: "Help" },
];

export const footerGroups = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/compatibility", label: "Supported apps" },
      { href: "/pricing", label: "Pricing" },
      { href: "/changelog", label: "Changelog" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/help", label: "Help & FAQ" },
      { href: "/download", label: "Download & install" },
      { href: "/recover", label: "Find my licence" },
      { href: "/contact", label: "Support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/refunds", label: "Refunds" },
    ],
  },
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
