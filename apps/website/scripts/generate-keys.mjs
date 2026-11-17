// Prints fresh secrets for .env.local / the host's secret store. Prints to stdout only; writes no files.
// The Ed25519 PUBLIC key (raw, base64) goes into the Mac app: apps/macos/.../LicenceConfig.swift.
import { generateKeyPairSync, randomBytes } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const pem = privateKey.export({ type: "pkcs8", format: "pem" });
const spki = publicKey.export({ type: "spki", format: "der" });
const b64 = (n) => randomBytes(n).toString("base64");

console.log(`ENTITLEMENT_PRIVATE_KEY_B64=${Buffer.from(pem).toString("base64")}`);
console.log(`LICENCE_KEY_PEPPER_B64=${b64(32)}`);
console.log(`DATA_ENCRYPTION_KEY_B64=${b64(32)}`);
console.log(`RATE_LIMIT_SALT_B64=${b64(32)}`);
console.log(`CRON_SECRET=${randomBytes(32).toString("base64url")}`);
console.log("");
console.log(`# Mac app public key (safe to ship): ${spki.subarray(spki.length - 32).toString("base64")}`);
console.error("\nKeep the private values secret. Losing ENTITLEMENT_PRIVATE_KEY or DATA_ENCRYPTION_KEY breaks activation/recovery.");
