# PlainClick (working name)

> Clear controls. Less clutter.

A small, separate action panel for **supported** Mac apps. It does **not** restyle, shrink or replace any app's
toolbar, and it doesn't change macOS appearance. "PlainClick" is a provisional name; domain and trademark availability have not been checked.

## Status (2026-11-17)

| Part | State | Verified how |
|---|---|---|
| Website (Next.js 16, Tailwind 4): 12 pages in pre-release state, checkout off, no download link | Built | `next build` passes; checked in a browser (desktop + mobile, light + dark) on Windows |
| Licensing backend: Paddle webhook, licences, 2-Mac activation, Ed25519 entitlements, email outbox, recovery, rate limits | Built | **19 automated tests pass** (`npm test`) against embedded Postgres (PGlite) |
| DB migrations | Written | Applied by the tests (PGlite); not yet run against a real Postgres server |
| Mac app: menu bar, panel, AX command engine, settings, per-app config, licence, trial, appearance guide | **Compiles** | GitHub Actions macOS runner (arm64), 2026-11-17: `swift build` + ad-hoc signed `.app` bundle succeed. **Never launched or used on a real Mac.** |
| Swift licensing tests (shared vector with the Node signer) | Passing | Same CI run: `swift test` passes, so CryptoKit accepts the Node-signed entitlement and rejects tampered ones |
| Feasibility with real TextEdit/Finder/Safari | **Narrow go: 5 actions pass** | Automated on GitHub macOS VMs, macOS 15.8.2 + 26.7.2: Save, Find, New Folder, Reload, New Tab 20/20 each; 0 wrong-app events. Back/Forward dropped (stale menu state). See `docs/feasibility-report.md` |
| Real app UI (hotkey ⌃⌥P, panel, real clicks, focus) | **Works on CI** | `--ui-test` on macOS 15.8.2 + 26.7.2: 15/17 checks; clicks run commands while TextEdit keeps focus. Screenshots in `docs/screenshots/` |
| Hands-on test on a physical Mac (permission flow, VoiceOver, multi-monitor) | **Not run** | No Mac available |
| CI macOS minutes | **Used up for this month** | Private repo; macOS jobs count 10×. The feasibility workflow is now manual-only |
| Paddle, email provider, hosting, Apple Developer ID | **Not set up** | Needs your accounts |

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
