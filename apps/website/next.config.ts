import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";

// Next.js inlines its bootstrap scripts and styles, so 'unsafe-inline' is required for script/style; everything else
// is locked to this origin. Paddle's origins are allowed only in a server build not set to Dodo (the pricing page then renders Paddle checkout).
const paddle = process.env.STATIC_EXPORT !== "1" && process.env.PAYMENT_PROVIDER !== "dodo";

export const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}${paddle ? " https://cdn.paddle.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws: wss:" : ""}${paddle ? " https://*.paddle.com" : ""}`,
  paddle ? "frame-src https://*.paddle.com" : "frame-src 'none'",
  "frame-ancestors 'none'",
  // Chromium applies form-action to redirects: the server-mode checkout form 303s to Dodo's hosted checkout.
  "form-action 'self' https://*.dodopayments.com",
  "base-uri 'self'",
  "object-src 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// FREE mode: `npm run build:static` → plain HTML in out/ for any static host (Cloudflare Pages, GitHub Pages…).
// Only page.tsx/layout.tsx files are built (pageExtensions "tsx"), so the server API routes (route.ts) are left out.
// Static hosts can't send headers from here; public/_headers carries the same headers for Cloudflare Pages.
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = staticExport
  ? {
      output: "export",
      pageExtensions: ["tsx"],
      trailingSlash: true,
      images: { unoptimized: true },
      poweredByHeader: false,
    }
  : {
      poweredByHeader: false,
      serverExternalPackages: ["pg"],
      async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
      },
    };

export default nextConfig;
