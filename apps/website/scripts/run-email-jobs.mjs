// Triggers the durable email outbox once. Use from any scheduler: SITE_URL=... CRON_SECRET=... npm run jobs:email
const site = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is not set");
  process.exit(1);
}
const res = await fetch(`${site}/api/jobs/email`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
console.log(res.status, await res.text());
if (!res.ok) process.exitCode = 1;
