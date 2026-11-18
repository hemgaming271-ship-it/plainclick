# PlainClick (working name)

> Clear controls. Less clutter.

A small, separate action panel for **supported** Mac apps. It does **not** restyle, shrink or replace any app's
toolbar, and it doesn't change macOS appearance. "PlainClick" is a provisional name; domain and trademark availability have not been checked.

## Status (2026-11-17)

| Part | State | Verified how |
|---|---|---|
| Website (Next.js 16, Tailwind 4): 12 pages in pre-release state, checkout off, no download link | Built | `next build` passes; checked in a browser (desktop + mobile, light + dark) on Windows |
| Licensing backend: Dodo Payments webhook + hosted checkout (Paddle adapter kept as an alternative), licences, 2-Mac activation, Ed25519 entitlements, email outbox, recovery, rate limits | Built | **35 automated tests pass** (`npm test`) against embedded Postgres (PGlite), 2026-11-18. Dodo payloads follow its docs; no real test-mode purchase yet |
| Signing + notarization pipeline (`release.yml`, Windows CSR/.p12 helpers) | Built | Helpers tested end to end on Windows with a throwaway CA; needs an Apple Developer account to produce a real signed build. See `docs/signing-setup.md` |
| DB migrations | Written | Applied by the tests (PGlite); not yet run against a real Postgres server |
| Mac app: menu bar, panel, AX command engine, settings, per-app config, licence, trial, appearance guide | **Compiles** | GitHub Actions macOS runner (arm64), 2026-11-17: `swift build` + ad-hoc signed `.app` bundle succeed, and the app runs on the CI Macs (see the UI row). **Not yet used by a person on a physical Mac.** |
| Swift licensing tests (shared vector with the Node signer) | Passing | Same CI run: `swift test` passes, so CryptoKit accepts the Node-signed entitlement and rejects tampered ones |
| Feasibility with real TextEdit/Finder/Safari | **Narrow go: 5 actions pass** | Automated on GitHub macOS VMs, macOS 15.8.2 + 26.7.2: Save, Find, New Folder, Reload, New Tab 20/20 each; 0 wrong-app events. Back/Forward dropped (stale menu state). See `docs/feasibility-report.md` |
| Real app UI (hotkey ⌃⌥P, panel, real clicks, focus) | **Works on CI** | `--ui-test` on macOS 15.8.2 + 26.7.2: **17/17 checks on both**. Real clicks save and find in TextEdit, and typing stays in TextEdit. Screenshots in `docs/screenshots/` |
| Hands-on test on a physical Mac (permission flow, VoiceOver, multi-monitor) | **Not run** | No Mac available |
| Repository | **Public** (since 2026-11-17) | GitHub-hosted macOS runners are free for public repos; no LICENSE file, so all rights are reserved |
| Dodo Payments seller account | **Exists** (owner's) | Product, licence keys and payment link not created yet |
| **Free release path** (chosen 2026-11-18): Dodo licence keys + payment link, static site, self-signed signing, GitHub Releases | Built | App ↔ Dodo licence API unit-tested; self-signed identity proven stable across builds on CI; static site builds and was checked in a browser. Guide: `docs/free-release.md` |
| Apple Developer ID / notarization, email provider, server hosting | Not needed for the free path | Optional later (`docs/signing-setup.md`) |

The core mechanism now has evidence: five actions work reliably with the real apps on macOS 15 and 26. Navigation actions
(Back/Forward) don't, so they're excluded. What remains unproven is the app's own UI on a real Mac. Keep checkout off until
a signed build has been used by a person on a physical Mac.

## Layout
```
apps/website/            Next.js site + licensing API + db/migrations + tests
apps/macos/              Swift package: PlainClickLicensing (library + tests) and the app target
packages/licence-contracts/  Wire format + cross-language test vector
docs/                    spec, feasibility, compatibility, privacy map, launch plan/budget,
                         setup & deployment, release checklist, support guide
.github/workflows/       website CI (Ubuntu) + macOS compile/test CI
```

Start here: [docs/setup-and-deployment.md](docs/setup-and-deployment.md).
