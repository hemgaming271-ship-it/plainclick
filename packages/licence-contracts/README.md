# Licence contracts (v1)

This is the shared wire format between the licensing server (`apps/website/src/server`) and the Mac app (`apps/macos/Sources/PlainClickLicensing`).
Each side implements it natively. There is no shared build step.

## Licence key
`PLCK-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX` — 120 random bits, written in Crockford base32 (`0-9 A-Z` minus `I L O U`).
Input is normalised: case-insensitive, separators ignored, `O→0`, `I/L→1`.
The server stores only `HMAC-SHA256(pepper, normalised)` for lookup, plus an AES-256-GCM copy used for recovery emails.

## Entitlement
```
pc1.<base64url(payload JSON bytes)>.<base64url(Ed25519 signature over those exact bytes)>
```
Payload:
```json
{"v":1,"product":"plainclick","major":1,"kind":"perpetual","lid":"<licence public id>","iid":"<installation UUID>","iat":1795000000}
```
- Signed server-side with Ed25519. The app ships only the raw 32-byte public key, base64-encoded.
- Verification order: signature over the raw bytes first, then the claims (`v`, `product`, `kind`, `iid` = this installation, `major` = app major version).
- Entitlements don't expire. Online validation (`POST /api/licences/validate`) can return `valid | invalid | revoked | deactivated`. The app removes its cached entitlement only on `revoked` or `deactivated`, never on network errors.

## Endpoints (JSON, POST)
| Path | Body | Success | Errors |
|---|---|---|---|
| `/api/licences/activate` | `licenceKey, installationId (UUID), appVersion?, deviceLabel?` | 200 `{status:"activated", entitlement, activationsUsed, activationsAllowed}` | 404 invalid_key · 403 revoked · 409 limit_reached · 429 |
| `/api/licences/validate` | `entitlement, installationId` | 200 `{status}` | 400 · 429 |
| `/api/licences/deactivate` | `licenceKey, installationId` | 200 `{status:"deactivated"}` (idempotent) | 404 · 429 |
| `/api/licences/recover` | `email` | 200 generic message, always | 400 · 429 |
| `/api/licences/recover/confirm` | `token, resetActivations` | 200 `{status:"ok", licences, reset}` | 410 expired/used · 429 |
| `/api/webhooks/paddle` | raw provider body + `Paddle-Signature` | 200 | 401 bad signature |

## Test vector
`test-vectors/entitlement-v1.json` was produced by `scripts/make-test-vector.mjs` with a **throwaway** key.
The Swift tests (`apps/macos/Tests`) verify it, which proves the Node signer and CryptoKit verifier agree.
After regenerating it, copy it to `apps/macos/Tests/PlainClickLicensingTests/`.
