import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign,
  timingSafeEqual,
  verify,
  type KeyObject,
} from "node:crypto";
import { config } from "./config";

// Crockford base32 (no I, L, O, U) — easy to read aloud and type.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const KEY_BYTES = 15; // 120 bits → 24 base32 chars
const KEY_CHARS = 24;

function base32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Cryptographically random licence key, e.g. PLCK-7KQ2-M9XA-... (6 groups of 4). */
export function generateLicenceKey(): string {
  const body = base32(randomBytes(KEY_BYTES));
  return "PLCK-" + body.match(/.{4}/g)!.join("-");
}

/** Accepts pasted keys with spaces, lower case, missing dashes, and common look-alike characters. */
export function normaliseLicenceKey(input: string): string | null {
  let s = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (s.startsWith("PLCK")) s = s.slice(4);
  s = s.replace(/O/g, "0").replace(/[IL]/g, "1");
  if (s.length !== KEY_CHARS) return null;
  for (const c of s) if (!ALPHABET.includes(c)) return null;
  return s;
}

/** Deterministic lookup representation: HMAC-SHA256 with a server-only pepper. The key itself is never stored in clear. */
export function licenceKeyLookup(normalised: string): string {
  return createHmac("sha256", config.licencePepper()).update(normalised).digest("hex");
}

export const sha256Hex = (s: string) => createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const randomId = (bytes = 12) => randomBytes(bytes).toString("hex");

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** AES-256-GCM. Output: base64(iv[12] | tag[16] | ciphertext). */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", config.dataKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decrypt(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const decipher = createDecipheriv("aes-256-gcm", config.dataKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

// ---------- Entitlements (Ed25519) ----------
// Format: "pc1." + base64url(payloadJSONBytes) + "." + base64url(signature over payloadJSONBytes)
// The app verifies the signature over the exact decoded bytes, then parses JSON. See packages/licence-contracts.

export interface EntitlementPayload {
  v: 1;
  product: "plainclick";
  major: number;
  kind: "perpetual";
  lid: string; // licence public id
  iid: string; // installation id
  iat: number; // issued-at, unix seconds
}

let cachedKey: { pem: string; priv: KeyObject; pub: KeyObject } | null = null;
function keys() {
  const pem = config.entitlementPrivateKeyPem();
  if (!cachedKey || cachedKey.pem !== pem) {
    const priv = createPrivateKey(pem);
    cachedKey = { pem, priv, pub: createPublicKey(priv) };
  }
  return cachedKey;
}

export function signEntitlement(payload: EntitlementPayload): string {
  const bytes = Buffer.from(JSON.stringify(payload), "utf8");
  const sig = sign(null, bytes, keys().priv);
  return `pc1.${bytes.toString("base64url")}.${sig.toString("base64url")}`;
}

export function verifyEntitlement(token: string, publicKey: KeyObject = keys().pub): EntitlementPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "pc1") return null;
  try {
    const bytes = Buffer.from(parts[1], "base64url");
    const sig = Buffer.from(parts[2], "base64url");
    if (sig.length !== 64 || !verify(null, bytes, publicKey, sig)) return null;
    const p = JSON.parse(bytes.toString("utf8"));
    if (p?.v !== 1 || p.product !== "plainclick" || typeof p.lid !== "string" || typeof p.iid !== "string") return null;
    return p as EntitlementPayload;
  } catch {
    return null;
  }
}

/** Raw 32-byte Ed25519 public key, base64 — the form the Mac app embeds (CryptoKit rawRepresentation). */
export function entitlementPublicKeyRawB64(): string {
  const der = keys().pub.export({ type: "spki", format: "der" });
  return der.subarray(der.length - 32).toString("base64");
}
