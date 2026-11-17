// Generates a TEST-ONLY entitlement vector so the Swift verifier can be checked against the Node signer.
// The key pair is throwaway and printed in the vector on purpose; it is NOT the production key.
import { generateKeyPairSync, sign } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const spki = publicKey.export({ type: "spki", format: "der" });
const payload = { v: 1, product: "plainclick", major: 1, kind: "perpetual", lid: "0123456789abcdef01234567", iid: "6F1C2E9A-3B4D-4E5F-8A9B-0C1D2E3F4A5B", iat: 1795000000 };
const bytes = Buffer.from(JSON.stringify(payload), "utf8");
const token = `pc1.${bytes.toString("base64url")}.${sign(null, bytes, privateKey).toString("base64url")}`;
const tamperedBytes = Buffer.from(JSON.stringify({ ...payload, major: 2 }), "utf8");
const tampered = `pc1.${tamperedBytes.toString("base64url")}.${token.split(".")[2]}`;

const out = {
  note: "TEST ONLY. Throwaway key. Regenerate with node packages/licence-contracts/scripts/make-test-vector.mjs",
  publicKeyRawB64: spki.subarray(spki.length - 32).toString("base64"),
  installationId: payload.iid,
  valid: token,
  tampered,
};
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "test-vectors");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "entitlement-v1.json"), JSON.stringify(out, null, 2) + "\n");
console.log("wrote test-vectors/entitlement-v1.json");
