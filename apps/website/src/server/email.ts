import "server-only";
import { config, isProduction } from "./config";
import { decrypt } from "./crypto";
import type { Db } from "./db";
import type { PaymentProvider } from "./payments/types";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(email: OutgoingEmail): Promise<void>;
}

export function resendMailer(apiKey: string, from: string, fetchImpl: typeof fetch = fetch): Mailer {
  return {
    async send({ to, subject, text }) {
      const res = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, text }),
      });
      if (!res.ok) throw new Error(`Email provider HTTP ${res.status}`);
    },
  };
}

/** DEVELOPMENT ONLY: prints emails (including licence keys) to the server console. Refused in production. */
export function consoleMailer(): Mailer {
  if (isProduction()) throw new Error("EMAIL_PROVIDER=console is not allowed in production");
  return {
    async send(e) {
      console.log(`\n[DEV EMAIL] to=${e.to}\nsubject: ${e.subject}\n${e.text}\n[/DEV EMAIL]\n`);
    },
  };
}

export function getMailer(): Mailer {
  return config.emailProvider() === "resend" ? resendMailer(config.resendApiKey(), config.emailFrom()) : consoleMailer();
}

// ---------- Templates ----------

type Payload =
  | { kind: "licence_delivery"; licenceKey: string }
  | { kind: "recovery_link"; url: string; expiresMinutes: number };

export function renderEmail(p: Payload): { subject: string; text: string } {
  const support = config.supportEmail();
  if (p.kind === "licence_delivery") {
    return {
      subject: "Your PlainClick licence key",
      text: [
        "Thank you for buying PlainClick.",
        "",
        `Your licence key: ${p.licenceKey}`,
        "",
        "To activate: open PlainClick → Manage Licence → paste the key → Activate.",
        "Your licence is a perpetual personal licence for PlainClick v1, including all v1 updates, on up to two Macs you own.",
        "Activation needs an internet connection once; after that the panel works offline.",
        "",
        `Lost this email? Recover your key at ${config.siteUrl()}/recover`,
        `Questions: ${support}`,
      ].join("\n"),
    };
  }
  return {
    subject: "Your PlainClick licence recovery link",
    text: [
      "Someone (hopefully you) asked to recover a PlainClick licence for this email address.",
      "",
      `Open this link within ${p.expiresMinutes} minutes. It works once:`,
      p.url,
      "",
      "If you didn't ask for this, you can ignore this email.",
      `Questions: ${support}`,
    ].join("\n"),
  };
}

// ---------- Durable outbox processing ----------

const MAX_ATTEMPTS = 8;
/** Backoff after attempt n (1-based): 1m, 2m, 4m, … capped at 6h. */
export const backoffSeconds = (attempt: number) => Math.min(60 * 2 ** (attempt - 1), 6 * 3600);

/** Strips anything that looks like a key or token before storing an error message. */
const sanitise = (msg: string) => msg.replace(/PLCK[-A-Z0-9]+/gi, "[key]").replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]").slice(0, 300);

/**
 * Claims due jobs with a lease (so concurrent runners don't double-send), sends them, and records the outcome.
 * Safe to call from the webhook (best effort) and from a cron (POST /api/jobs/email).
 */
export async function processDueEmailJobs(db: Db, mailer: Mailer, provider: PaymentProvider | null, limit = 10) {
  const { rows: jobs } = await db.query(
    `UPDATE email_jobs SET attempts = attempts + 1, next_attempt_at = now() + interval '10 minutes'
       WHERE id IN (SELECT id FROM email_jobs WHERE status = 'pending' AND next_attempt_at <= now()
                    ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED)
     RETURNING id, kind, purchase_id, to_email, payload_ciphertext, attempts`,
    [limit],
  );
  const results: { id: number; ok: boolean }[] = [];
  for (const job of jobs) {
    try {
      let to: string | null = job.to_email;
      if (!to && job.purchase_id) {
        const { rows } = await db.query(`SELECT customer_email, provider_customer_id FROM purchases WHERE id = $1`, [job.purchase_id]);
        to = rows[0]?.customer_email ?? null;
        if (!to && rows[0]?.provider_customer_id && provider) {
          to = await provider.getCustomerEmail(rows[0].provider_customer_id);
          if (to) await db.query(`UPDATE purchases SET customer_email = $1, updated_at = now() WHERE id = $2`, [to, job.purchase_id]);
        }
        if (to) await db.query(`UPDATE email_jobs SET to_email = $1 WHERE id = $2`, [to, job.id]);
      }
      if (!to) throw new Error("recipient email not yet available");
      const payload = JSON.parse(decrypt(job.payload_ciphertext)) as Payload;
      await mailer.send({ to, ...renderEmail(payload) });
      // Wipe the encrypted payload once delivered; recovery uses licences.key_ciphertext instead.
      await db.query(`UPDATE email_jobs SET status = 'sent', sent_at = now(), payload_ciphertext = '', last_error = NULL WHERE id = $1`, [job.id]);
      results.push({ id: Number(job.id), ok: true });
    } catch (e: any) {
      const attempts = Number(job.attempts);
      const failed = attempts >= MAX_ATTEMPTS;
      await db.query(
        `UPDATE email_jobs SET status = $2, last_error = $3, next_attempt_at = now() + ($4 || ' seconds')::interval WHERE id = $1`,
        [job.id, failed ? "failed" : "pending", sanitise(String(e?.message ?? e)), String(backoffSeconds(attempts))],
      );
      results.push({ id: Number(job.id), ok: false });
    }
  }
  return results;
}
