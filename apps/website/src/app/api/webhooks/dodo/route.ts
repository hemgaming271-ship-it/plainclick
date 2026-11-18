import { webhookPOST } from "@/server/webhookRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dodo dashboard > Webhooks: https://<domain>/api/webhooks/dodo, events payment.succeeded + refund.succeeded.
export const POST = webhookPOST;
