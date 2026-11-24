# Free release setup (no Apple fee, no server)

Everything here costs **nothing up front**. Dodo Payments takes its fee per sale, and that is the only cost.

| Need | Free solution | Where |
|---|---|---|
| Payment | Dodo Payments static payment link | Dodo dashboard → product → payment link |
| Licence keys | Dodo creates one per purchase, emails it, and enforces the 2-Mac limit | Product → License key ON, activation limit **2** |
| Key check in the app | Dodo's **public** `/licenses/activate`, `/validate` and `/deactivate` endpoints, with no API key in the app | `apps/macos/Sources/PlainClickLicensing/DodoLicence.swift` |
| Website | Static export (`npm run build:static` → `out/`) | Cloudflare Pages (free) |
| Download | GitHub Releases on this public repo | `release.yml` makes a **draft** that you publish |
| Signing | Self-signed certificate | `tools/signing/New-SelfSignedSigningCert.ps1` |
| Builds and tests | GitHub Actions, free for public repos | `.github/workflows/` |

**What you give up by not paying Apple:** the app isn't notarized. The first time a buyer opens it, they click
**System Settings → Privacy & Security → Open Anyway**, and again after each update. The download page, Help and Terms say this plainly.
Never tell buyers to turn Gatekeeper off, and never call the app "notarized" or "Apple verified".
If you pay Apple later, follow `docs/signing-setup.md`. `release.yml` switches to notarized mode on its own once those secrets exist.

## 1. Dodo product (test mode first)
1. Dodo dashboard (**Test mode**) → Products → New:
   - one-time, **US$5.99**, digital
   - **License key: ON, activation limit 2**, no expiry
   - turn adaptive/local currency off if you see the option; the Buy link also sets `paymentCurrency=USD`
2. Copy the product ID (`pdt_…`) and the product's **payment link**.
3. In Dodo's settings, check what happens to a licence key after a **refund**. If keys aren't disabled automatically, disable
   the key yourself in the dashboard whenever you refund. The app removes access on its next online check (`valid: false`).

## 2. Self-signed certificate (once, on Windows)
```powershell
cd C:\Users\hemma\OneDrive\Desktop\plainclick
powershell -ExecutionPolicy Bypass -File tools\signing\New-SelfSignedSigningCert.ps1
```
The script writes its files to `%USERPROFILE%\PlainClick-signing\`.
Back up `PlainClick-SelfSigned.p12` and its password somewhere safe. **Re-use this same certificate forever.** A new
certificate gives the app a new identity, and every user would have to grant Accessibility again.

## 3. GitHub settings (repo → Settings → Secrets and variables → Actions)
| Name | Kind | Value |
|---|---|---|
| `SELFSIGNED_P12_BASE64` | Secret | contents of `SELFSIGNED_P12_BASE64.txt` |
| `SELFSIGNED_P12_PASSWORD` | Secret | contents of `SELFSIGNED_P12_PASSWORD.txt` |
| `BUNDLE_ID` | Variable | e.g. `io.github.<your-github-name>.plainclick`, chosen once |
| `DODO_ENV` | Variable | `test` while testing, `live` for real sales |
| `DODO_PRODUCT_ID` | Variable | `pdt_…` (test and live products have different IDs) |

## 4. Test build with test keys
1. Go to Actions → **Release build** → Run workflow → version `0.1.0`, leaving "draft release" off.
2. Download the `plainclick-release` artifact. The job summary shows the signature, the stable designated requirement and the Dodo settings.
3. Someone with a Mac installs it (Open Anyway), buys with Dodo's **test card** through the test payment link, activates the key,
   deactivates it, and activates on a second Mac. A third Mac must be refused.

## 5. Website on Cloudflare Pages (free, commercial use allowed)
1. Create a free Cloudflare account and go to Workers & Pages → Create → Pages → **Connect to Git** → this repo.
2. Use these build settings:
   - Root directory: `apps/website`
   - Build command: `npm run build:static`
   - Output directory: `out`
3. Set these environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | the `https://<name>.pages.dev` address Cloudflare gives you |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | a free email address you check |
| `NEXT_PUBLIC_SELLER_NAME` | your legal name |
| `NEXT_PUBLIC_DODO_PAYMENT_LINK` | the payment link from step 1 |
| `NEXT_PUBLIC_RELEASE_AVAILABLE` | `false` until step 6 |
| `NEXT_PUBLIC_CHECKOUT_ENABLED` | `false` until step 6 |

4. Every push to `main` redeploys the site. `public/_headers` sets the security headers.

GitHub Pages also works for static files. Its terms, however, say it isn't meant to run an online business or e-commerce site, so Cloudflare Pages is the safer free choice.

## 6. Going live
1. Switch Dodo to **Live**, create the same product there, and set the variables `DODO_ENV=live` and `DODO_PRODUCT_ID=<live pdt_…>`.
2. Actions → Release build → version `1.0.0`, **draft release ON**. Review the draft under Releases and press **Publish**.
   The stable download URL is `https://github.com/<owner>/plainclick/releases/latest/download/PlainClick.zip`.
3. On Cloudflare set:
   - `NEXT_PUBLIC_DODO_PAYMENT_LINK` = the live link
   - `NEXT_PUBLIC_DOWNLOAD_URL` = the URL above
   - `NEXT_PUBLIC_RELEASE_VERSION=1.0.0`
   - `NEXT_PUBLIC_RELEASE_SHA256` = the value from the release notes
   - `NEXT_PUBLIC_RELEASE_AVAILABLE=true`
   - `NEXT_PUBLIC_CHECKOUT_ENABLED=true`

   Then redeploy.
4. Buy one copy yourself with a real card, activate it, then refund it. Check that the key stops working.

## Known limits of the free setup
- No notarization, so buyers see the one-time "Open Anyway" step.
- Licence state on the Mac isn't tamper-proof, the same as the trial. That's acceptable for a US$5.99 app.
- No self-service "reset my lost Mac": buyers email you, and you remove that activation in the Dodo dashboard.
- Dodo's licence endpoints and webhook shapes are taken from their docs. Confirm them with a test-mode purchase (step 4).
