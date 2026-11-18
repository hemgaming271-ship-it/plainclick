import type { NextConfig } from "next";

const securityHeaders = [
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
