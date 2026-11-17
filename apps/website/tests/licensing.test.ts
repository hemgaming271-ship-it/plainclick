import { randomUUID, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { makeDb, refundEvent, setTestEnv, signedHeaders, txnCompleted } from "./support/setup";
import type { Db } from "@/server/db";

setTestEnv();

const { handleWebhook } = await import("@/server/fulfilment");
const { getPaymentProvider } = await import("@/server/payments");
const { processDueEmailJobs } = await import("@/server/email");
const lic = await import("@/server/licensing");
const crypto = await import("@/server/crypto");
const { allow } = await import("@/server/rateLimit");

let db: Db;
const provider = () => getPaymentProvider();
const sent: { to: string; subject: string; text: string }[] = [];
const okMailer = { async send(e: any) { sent.push(e); } };

async function buy(body = txnCompleted()) {
  return handleWebhook(db, provider(), body, signedHeaders(body));
}
/** Runs the outbox and returns the licence key from the delivered email. */
async function deliveredKey(): Promise<string> {
  sent.length = 0;
  await processDueEmailJobs(db, okMailer, provider());
  const m = sent.at(-1)?.text.match(/PLCK(-[0-9A-Z]{4}){6}/);
  if (!m) throw new Error("no licence email");
  return m[0];
}
const count = async (sql: string, p: unknown[] = []) => Number((await db.query(sql, p)).rows[0].c);

beforeEach(async () => {
  ({ db } = await makeDb());
  sent.length = 0;
});

describe("webhooks", () => {
  it("rejects a missing or invalid signature", async () => {
    const body = txnCompleted();
    expect((await handleWebhook(db, provider(), body, new Headers())).httpStatus).toBe(401);
    expect((await handleWebhook(db, provider(), body, signedHeaders(body, "wrong-secret"))).httpStatus).toBe(401);
    // Body altered after signing
    const h = signedHeaders(body);
    expect((await handleWebhook(db, provider(), body.replace("599", "1"), h)).httpStatus).toBe(401);
    expect(await count(`SELECT count(*) c FROM purchases`)).toBe(0);
  });

  it("rejects a stale signature timestamp (replay)", async () => {
    const body = txnCompleted();
    const r = await handleWebhook(db, provider(), body, signedHeaders(body, undefined, Math.floor(Date.now() / 1000) - 3600));
    expect(r.httpStatus).toBe(401);
  });

  it("creates exactly one licence and one email for a purchase, even with duplicate and retried events", async () => {
    const body = txnCompleted({ txnId: "txn_dup" });
    const first = await buy(body);
    expect(first.outcome).toMatch(/^fulfilled/);
    const dup = await buy(body); // identical redelivery
    expect(dup).toMatchObject({ httpStatus: 200, duplicate: true });
    const retry = await buy(txnCompleted({ txnId: "txn_dup" })); // new event id, same transaction
    expect(retry.outcome).toBe("already_fulfilled");
    expect(await count(`SELECT count(*) c FROM licences`)).toBe(1);
    expect(await count(`SELECT count(*) c FROM email_jobs`)).toBe(1);
  });

  it.each([
    ["wrong price id", { priceId: "pri_other" }, "wrong_price_id"],
    ["wrong currency", { currency: "EUR" }, "currency=EUR"],
    ["wrong amount", { subtotal: "100" }, "subtotal=100"],
    ["discount applied", { discount: "100" }, "discount=100"],
    ["quantity > 1", { quantity: 2 }, "quantity=2"],
  ])("does not fulfil %s", async (_name, over, reason) => {
    const r = await buy(txnCompleted(over as any));
    expect(r.outcome).toContain("needs_review");
    expect(r.outcome).toContain(reason);
    expect(await count(`SELECT count(*) c FROM licences`)).toBe(0);
  });

  it("handles a refund that arrives BEFORE the payment event", async () => {
    await handleWebhook(db, provider(), refundEvent("txn_early"), signedHeaders(refundEvent("txn_early")));
    const refund = refundEvent("txn_early");
    expect((await handleWebhook(db, provider(), refund, signedHeaders(refund))).outcome).toBe("refunded_before_fulfilment");
    const pay = await buy(txnCompleted({ txnId: "txn_early" }));
    expect(pay.outcome).toBe("payment_after_refund_no_licence");
    expect(await count(`SELECT count(*) c FROM licences`)).toBe(0);
  });

  it("revokes the licence on a full refund after fulfilment; partial refunds do not revoke", async () => {
    await buy(txnCompleted({ txnId: "txn_r" }));
    const partial = refundEvent("txn_r", { type: "partial" });
    expect((await handleWebhook(db, provider(), partial, signedHeaders(partial))).outcome).toBe("partial_refund_recorded_no_revoke");
    const full = refundEvent("txn_r");
    expect((await handleWebhook(db, provider(), full, signedHeaders(full))).outcome).toBe("refunded_licence_revoked");
    expect((await db.query(`SELECT status FROM licences`)).rows[0].status).toBe("revoked");
  });
});

describe("activation", () => {
  it("allows two Macs, refuses a third, is idempotent per installation, and frees a slot on deactivation", async () => {
    await buy();
    const key = await deliveredKey();
    const [a, b, c] = [randomUUID(), randomUUID(), randomUUID()];
    expect((await lic.activate(db, { licenceKey: key, installationId: a })).status).toBe("activated");
    expect((await lic.activate(db, { licenceKey: key.toLowerCase().replace(/-/g, " "), installationId: b })).status).toBe("activated");
    expect((await lic.activate(db, { licenceKey: key, installationId: a })).status).toBe("activated"); // same Mac again
    const third = await lic.activate(db, { licenceKey: key, installationId: c });
    expect(third.status).toBe("limit_reached");
    expect(await lic.deactivate(db, { licenceKey: key, installationId: a })).toBe("ok");
    expect((await lic.activate(db, { licenceKey: key, installationId: c })).status).toBe("activated");
  });

  it("never exceeds the limit under concurrent activation requests", async () => {
    await buy();
    const key = await deliveredKey();
    const results = await Promise.all(Array.from({ length: 8 }, () => lic.activate(db, { licenceKey: key, installationId: randomUUID() })));
    expect(results.filter((r) => r.status === "activated")).toHaveLength(2);
    expect(await count(`SELECT count(*) c FROM activations WHERE deactivated_at IS NULL`)).toBe(2);
  });

  it("rejects unknown and malformed keys and revoked licences", async () => {
    expect((await lic.activate(db, { licenceKey: "PLCK-0000-0000-0000-0000-0000-0000", installationId: randomUUID() })).status).toBe("invalid_key");
    expect((await lic.activate(db, { licenceKey: "nonsense", installationId: randomUUID() })).status).toBe("invalid_key");
    await buy(txnCompleted({ txnId: "txn_rev" }));
    const key = await deliveredKey();
    const full = refundEvent("txn_rev");
    await handleWebhook(db, provider(), full, signedHeaders(full));
    expect((await lic.activate(db, { licenceKey: key, installationId: randomUUID() })).status).toBe("revoked");
  });
});

describe("entitlements", () => {
  it("validates genuine entitlements and rejects forged, tampered, or transplanted ones", async () => {
    await buy();
    const key = await deliveredKey();
    const iid = randomUUID();
    const r = await lic.activate(db, { licenceKey: key, installationId: iid });
    if (r.status !== "activated") throw new Error("activation failed");

    expect(await lic.validate(db, { entitlement: r.entitlement, installationId: iid })).toBe("valid");
    // Copied to another installation
    expect(await lic.validate(db, { entitlement: r.entitlement, installationId: randomUUID() })).toBe("invalid");
    // Payload tampered (signature no longer matches)
    const [p, body, sig] = r.entitlement.split(".");
    const forgedBody = Buffer.from(Buffer.from(body, "base64url").toString().replace(/"major":1/, '"major":2')).toString("base64url");
    expect(await lic.validate(db, { entitlement: `${p}.${forgedBody}.${sig}`, installationId: iid })).toBe("invalid");
    // Signed by an attacker's own key
    const evil = generateKeyPairSync("ed25519").privateKey;
    const evilSig = sign(null, Buffer.from(body, "base64url"), evil).toString("base64url");
    expect(await lic.validate(db, { entitlement: `${p}.${body}.${evilSig}`, installationId: iid })).toBe("invalid");
    expect(crypto.verifyEntitlement(`${p}.${body}.${evilSig}`)).toBeNull();
    // Verifies with only the exported raw public key (what the Mac app ships)
    const raw = Buffer.from(crypto.entitlementPublicKeyRawB64(), "base64");
    const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
    const pub = createPublicKey({ key: Buffer.concat([spkiPrefix, raw]), format: "der", type: "spki" });
    expect(crypto.verifyEntitlement(r.entitlement, pub)?.iid).toBe(iid);

    await lic.deactivate(db, { licenceKey: key, installationId: iid });
    expect(await lic.validate(db, { entitlement: r.entitlement, installationId: iid })).toBe("deactivated");
  });
});

describe("email outbox", () => {
  it("keeps the licence email through provider failures and wipes the payload once sent", async () => {
    await buy();
    let calls = 0;
    const flaky = { async send(e: any) { calls++; if (calls === 1) throw new Error("provider down PLCK-AAAA-BBBB"); sent.push(e); } };
    expect((await processDueEmailJobs(db, flaky, provider()))[0].ok).toBe(false);
    const after1 = (await db.query(`SELECT status, attempts, last_error, payload_ciphertext FROM email_jobs`)).rows[0];
    expect(after1).toMatchObject({ status: "pending", attempts: 1 });
    expect(after1.last_error).not.toContain("PLCK-AAAA"); // keys are redacted from stored errors
    expect(after1.payload_ciphertext).not.toBe("");
    // Not due yet → nothing happens
    expect(await processDueEmailJobs(db, flaky, provider())).toHaveLength(0);
    await db.query(`UPDATE email_jobs SET next_attempt_at = now() - interval '1 second'`);
    expect((await processDueEmailJobs(db, flaky, provider()))[0].ok).toBe(true);
    const after2 = (await db.query(`SELECT status, payload_ciphertext, to_email FROM email_jobs`)).rows[0];
    expect(after2).toMatchObject({ status: "sent", payload_ciphertext: "", to_email: "buyer@example.com" });
    expect(sent[0].text).toMatch(/PLCK(-[0-9A-Z]{4}){6}/);
  });
});

describe("recovery", () => {
  it("sends nothing for unknown emails, and links are single-use", async () => {
    await lic.requestRecovery(db, "nobody@example.com");
    expect(await count(`SELECT count(*) c FROM recovery_tokens`)).toBe(0);

    await buy(txnCompleted({ email: "Owner@Example.com" }));
    const key = await deliveredKey();
    await lic.activate(db, { licenceKey: key, installationId: randomUUID() });
    await lic.requestRecovery(db, "owner@example.com");
    sent.length = 0;
    await processDueEmailJobs(db, okMailer, provider());
    const token = sent[0].text.match(/#token=([A-Za-z0-9_-]+)/)![1];

    const r = await lic.confirmRecovery(db, token, true);
    if (r.status !== "ok") throw new Error("expected ok");
    expect(r.licences[0].key).toBe(key);
    expect(r.licences[0].activations).toHaveLength(0); // reset released the lost Mac
    expect((await lic.confirmRecovery(db, token, false)).status).toBe("invalid_or_expired");
  });

  it("rejects expired links", async () => {
    await buy();
    await deliveredKey();
    await lic.requestRecovery(db, "buyer@example.com", new Date(Date.now() - 60 * 60_000));
    sent.length = 0;
    await processDueEmailJobs(db, okMailer, provider());
    const token = sent[0].text.match(/#token=([A-Za-z0-9_-]+)/)![1];
    expect((await lic.confirmRecovery(db, token, false)).status).toBe("invalid_or_expired");
  });
});

describe("keys and rate limits", () => {
  it("generates well-formed unique keys and normalises pasted input", () => {
    const keys = new Set(Array.from({ length: 500 }, () => crypto.generateLicenceKey()));
    expect(keys.size).toBe(500);
    const k = [...keys][0];
    expect(k).toMatch(/^PLCK(-[0-9A-HJKMNP-TV-Z]{4}){6}$/);
    expect(crypto.normaliseLicenceKey(` ${k.toLowerCase()} `)).toBe(crypto.normaliseLicenceKey(k));
    expect(crypto.normaliseLicenceKey("PLCK-1234")).toBeNull();
  });

  it("limits requests per bucket and window", async () => {
    const now = new Date();
    for (let i = 0; i < 3; i++) expect(await allow(db, "t:x", 3, 3600, now)).toBe(true);
    expect(await allow(db, "t:x", 3, 3600, now)).toBe(false);
    expect(await allow(db, "t:y", 3, 3600, now)).toBe(true);
  });
});
