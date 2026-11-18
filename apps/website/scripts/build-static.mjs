// Builds the FREE static site into out/ (works on Windows, macOS, Linux and on Cloudflare Pages' build machines).
// Usage: npm run build:static
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const env = { ...process.env, STATIC_EXPORT: "1", NEXT_TELEMETRY_DISABLED: "1" };
if (env.NEXT_PUBLIC_SITE_MODE === "server") {
  console.error("NEXT_PUBLIC_SITE_MODE=server needs the Node server (npm run build), not a static export.");
  process.exit(1);
}
const bin = process.platform === "win32" ? "npx.cmd" : "npx";
const r = spawnSync(bin, ["next", "build"], { stdio: "inherit", env, shell: process.platform === "win32" });
if (r.status !== 0) process.exit(r.status ?? 1);

// Sanity checks on the output: every page exists, and no server-only route slipped in.
const must = ["index.html", "pricing/index.html", "download/index.html", "thanks/index.html", "recover/index.html", "_headers"];
const missing = must.filter((f) => !existsSync(`out/${f}`));
if (missing.length) {
  console.error("Static export is missing:", missing.join(", "));
  process.exit(1);
}
if (existsSync("out/api")) {
  console.error("out/api exists — API routes must not be in the static export.");
  process.exit(1);
}
const pricing = readFileSync("out/pricing/index.html", "utf8");
console.log(`Static site ready in out/ (${pricing.includes("checkout.dodopayments.com") ? "Buy button → Dodo" : "checkout closed"}).`);
