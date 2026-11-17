# Setup and deployment

## 1. Website + licensing backend (works on Windows, macOS or Linux)

Requirements: Node 22+. PostgreSQL 15+ is needed only to run the real server against a database; the tests use an embedded Postgres (PGlite).

```bash
cd apps/website
npm install
npm test              # 19 backend tests (webhooks, activation limits, entitlements, email retry, recovery, rate limits)
npm run typecheck
npm run dev           # http://localhost:3000 — site in pre-release state, checkout off
```

On Windows PowerShell, if `npm` is blocked by the execution policy, use `npm.cmd` instead (e.g. `npm.cmd run dev`).

### Running the API locally against Postgres
1. Create a database (local Postgres, Docker, or a free managed dev database).
2. `cp .env.example .env.local`, set `DATABASE_URL`.
3. `npm run keys:generate` → paste the printed secrets into `.env.local`. Put the printed **public** key into `apps/macos/Sources/PlainClickPrototype/LicenceManager.swift` → `LicenceConfig.publicKeyRawBase64`.
4. `npm run db:migrate`
5. Simulate a purchase with the mock provider (`PAYMENT_PROVIDER=mock`): send a signed `transaction.completed` body to `/api/webhooks/paddle`. See `tests/support/setup.ts` for the exact shape and signing. The licence email is printed in the dev server console.

## 2. Production hosting (decide later — nothing has been purchased)

At US$5.99 per sale, keep recurring costs small. A typical low-cost setup:

| Need | Option | Notes to check before choosing |
|---|---|---|
| Next.js host | Vercel Pro, Netlify, Render, Railway, or a small VPS | **Vercel's free Hobby plan is for non-commercial use.** A paid product needs a paid plan or another host. Check current terms. |
| PostgreSQL | Neon, Supabase, Render, Railway | Free tiers may pause idle databases. A paused DB must not drop webhooks; Paddle retries, but check the retry window. |
| Email | Resend, Postmark, Amazon SES | Needs a verified sending domain (SPF/DKIM). |
| Scheduler for email retries | Host cron, or GitHub Actions `schedule` calling `/api/jobs/email` | Every 5–10 min |
| Release files | GitHub Releases, Cloudflare R2, or S3 | A few MB per download |

Steps:
1. Set every variable from `.env.example` in the host's secret store (never commit them).
2. Run `npm run db:migrate` against production.
3. Keep `NEXT_PUBLIC_CHECKOUT_ENABLED=false` and `NEXT_PUBLIC_RELEASE_AVAILABLE=false` until the release checklist is complete.
4. Configure the provider's webhook URL: `https://<domain>/api/webhooks/paddle` (events: `transaction.completed`, `adjustment.created`, `adjustment.updated`).
5. Make sure the host passes the real client IP in `x-forwarded-for`, so rate limiting works per visitor.
6. Back up `ENTITLEMENT_PRIVATE_KEY_B64` and `DATA_ENCRYPTION_KEY_B64` offline. Losing them breaks activation and recovery for existing customers.

## 3. Paddle (not started — requires seller approval)
1. Apply for a Paddle account and confirm they accept your business type and country. **Not yet verified.**
2. In **sandbox**: create the product and a US$5.99 one-time price, and turn off localised prices and discounts. Otherwise the server's price check sends orders to `needs_review`, which is deliberate.
3. Set `PADDLE_ENV=sandbox`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_ID`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_PRICE_ID`, `PAYMENT_PROVIDER=paddle`.
4. Capture one real sandbox webhook for each event type and compare it field by field with `src/server/payments/paddle.ts` (the comment block lists what to check). Fix any differences before going live.
5. Run a full sandbox purchase → email → activation on a Mac → refund → validate shows `revoked`.

## 4. Mac app (needs a Mac)
See `apps/macos/README.md` and `docs/release-checklist.md`. Without a Mac, push the repository to GitHub. The `macos-build.yml` workflow compiles the app and runs the Swift licensing tests on a GitHub macOS runner.
