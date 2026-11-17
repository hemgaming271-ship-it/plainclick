import "server-only";
import { config } from "./config";
import { decrypt, encrypt, licenceKeyLookup, normaliseLicenceKey, randomToken, sha256Hex, signEntitlement, verifyEntitlement } from "./crypto";
import type { Db } from "./db";

export type ActivateResult =
  | { status: "activated"; entitlement: string; activationsUsed: number; activationsAllowed: number }
  | { status: "invalid_key" }
  | { status: "revoked" }
  | { status: "limit_reached"; activations: { deviceLabel: string | null; activatedAt: string }[]; activationsAllowed: number };

/**
 * Activates one installation. The licence row is locked FOR UPDATE, so concurrent activations of the same key are
 * serialised and the device limit cannot be exceeded. Re-activating an already-active installation is idempotent.
 */
export async function activate(
  db: Db,
  input: { licenceKey: string; installationId: string; appVersion?: string; deviceLabel?: string },
): Promise<ActivateResult> {
  const norm = normaliseLicenceKey(input.licenceKey);
  if (!norm) return { status: "invalid_key" };
  const lookup = licenceKeyLookup(norm);

  return db.tx(async (q) => {
    const { rows } = await q.query(`SELECT * FROM licences WHERE key_lookup = $1 FOR UPDATE`, [lookup]);
    const lic = rows[0];
    if (!lic) return { status: "invalid_key" as const };
    if (lic.status !== "active") return { status: "revoked" as const };

    const live = await q.query(
      `SELECT id, installation_id, device_label, activated_at FROM activations
        WHERE licence_id = $1 AND deactivated_at IS NULL ORDER BY activated_at`,
      [lic.id],
    );
    const existing = live.rows.find((r) => r.installation_id === input.installationId);
    if (existing) {
      await q.query(`UPDATE activations SET last_seen_at = now(), app_version = COALESCE($2, app_version) WHERE id = $1`, [
        existing.id,
        input.appVersion ?? null,
      ]);
    } else {
      if (live.rows.length >= lic.max_activations) {
        return {
          status: "limit_reached" as const,
          activationsAllowed: Number(lic.max_activations),
          activations: live.rows.map((r) => ({ deviceLabel: r.device_label, activatedAt: new Date(r.activated_at).toISOString() })),
        };
      }
      await q.query(
        `INSERT INTO activations (licence_id, installation_id, device_label, app_version) VALUES ($1, $2, $3, $4)`,
        [lic.id, input.installationId, input.deviceLabel?.slice(0, 64) ?? null, input.appVersion?.slice(0, 32) ?? null],
      );
    }
    const used = existing ? live.rows.length : live.rows.length + 1;
    const entitlement = signEntitlement({
      v: 1,
      product: "plainclick",
      major: Number(lic.major_version),
      kind: "perpetual",
      lid: lic.public_id,
      iid: input.installationId,
      iat: Math.floor(Date.now() / 1000),
    });
    return { status: "activated" as const, entitlement, activationsUsed: used, activationsAllowed: Number(lic.max_activations) };
  });
}

export type ValidateStatus = "valid" | "invalid" | "revoked" | "deactivated";

/** Online check the app makes opportunistically. The app must NOT block launch if this call fails. */
export async function validate(db: Db, input: { entitlement: string; installationId: string }): Promise<ValidateStatus> {
  const p = verifyEntitlement(input.entitlement);
  if (!p || p.iid !== input.installationId) return "invalid";
  const { rows } = await db.query(
    `SELECT l.status, a.id AS activation_id FROM licences l
       LEFT JOIN activations a ON a.licence_id = l.id AND a.installation_id = $2 AND a.deactivated_at IS NULL
      WHERE l.public_id = $1`,
    [p.lid, p.iid],
  );
  const r = rows[0];
  if (!r) return "invalid";
  if (r.status !== "active") return "revoked";
  if (!r.activation_id) return "deactivated";
  await db.query(`UPDATE activations SET last_seen_at = now() WHERE id = $1`, [r.activation_id]);
  return "valid";
}

/** Frees a device slot. Requires the licence key (proof of ownership). Idempotent. */
export async function deactivate(db: Db, input: { licenceKey: string; installationId: string }): Promise<"ok" | "invalid_key"> {
  const norm = normaliseLicenceKey(input.licenceKey);
  if (!norm) return "invalid_key";
  const { rows } = await db.query(`SELECT id FROM licences WHERE key_lookup = $1`, [licenceKeyLookup(norm)]);
  if (!rows[0]) return "invalid_key";
  await db.query(
    `UPDATE activations SET deactivated_at = now(), deactivated_by = 'app'
      WHERE licence_id = $1 AND installation_id = $2 AND deactivated_at IS NULL`,
    [rows[0].id, input.installationId],
  );
  return "ok";
}

// ---------- Recovery ----------

export const RECOVERY_TTL_MINUTES = 30;

/**
 * Always resolves the same way for the caller (the route returns a generic message), so it never reveals whether an
 * email has a purchase. If it does, a single-use, 30-minute link is queued by email.
 */
export async function requestRecovery(db: Db, emailRaw: string, now = new Date()): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  const { rows } = await db.query(
    `SELECT 1 FROM purchases p JOIN licences l ON l.purchase_id = p.id WHERE lower(p.customer_email) = $1 LIMIT 1`,
    [email],
  );
  if (!rows[0]) return;
  const token = randomToken();
  const expires = new Date(now.getTime() + RECOVERY_TTL_MINUTES * 60_000);
  await db.tx(async (q) => {
    await q.query(`INSERT INTO recovery_tokens (token_hash, email, expires_at) VALUES ($1, $2, $3)`, [sha256Hex(token), email, expires.toISOString()]);
    const url = `${config.siteUrl()}/recover/confirm#token=${token}`;
    await q.query(
      `INSERT INTO email_jobs (kind, to_email, payload_ciphertext) VALUES ('recovery_link', $1, $2)`,
      [email, encrypt(JSON.stringify({ kind: "recovery_link", url, expiresMinutes: RECOVERY_TTL_MINUTES }))],
    );
  });
}

export type RecoveryResult =
  | { status: "invalid_or_expired" }
  | {
      status: "ok";
      licences: { key: string; state: string; activations: { deviceLabel: string | null; activatedAt: string }[] }[];
      reset: boolean;
    };

/**
 * Consumes a recovery token (single use) and returns the customer's keys. If resetActivations is true, all live
 * activations of those licences are released — this is the documented path for a lost or failed Mac.
 */
export async function confirmRecovery(db: Db, token: string, resetActivations: boolean): Promise<RecoveryResult> {
  return db.tx(async (q) => {
    const { rows } = await q.query(
      `UPDATE recovery_tokens SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING email`,
      [sha256Hex(token)],
    );
    if (!rows[0]) return { status: "invalid_or_expired" as const };
    const email = rows[0].email;
    const lics = await q.query(
      `SELECT l.id, l.key_ciphertext, l.status FROM licences l JOIN purchases p ON p.id = l.purchase_id
        WHERE lower(p.customer_email) = $1 ORDER BY l.id`,
      [email],
    );
    if (resetActivations) {
      await q.query(
        `UPDATE activations SET deactivated_at = now(), deactivated_by = 'recovery'
          WHERE deactivated_at IS NULL AND licence_id = ANY($1::bigint[])`,
        [lics.rows.map((l) => l.id)],
      );
    }
    const out = [];
    for (const l of lics.rows) {
      const acts = await q.query(
        `SELECT device_label, activated_at FROM activations WHERE licence_id = $1 AND deactivated_at IS NULL ORDER BY activated_at`,
        [l.id],
      );
      out.push({
        key: decrypt(l.key_ciphertext),
        state: l.status,
        activations: acts.rows.map((a) => ({ deviceLabel: a.device_label, activatedAt: new Date(a.activated_at).toISOString() })),
      });
    }
    return { status: "ok" as const, licences: out, reset: resetActivations };
  });
}
