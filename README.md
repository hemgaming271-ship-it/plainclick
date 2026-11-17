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
| Mac app: menu bar, panel, AX command engine, settings, per-app config, licence, trial, appearance guide | **Source only** | **Never compiled or run.** No Mac yet |
| Swift licensing tests (shared vector with the Node signer) | Written | Not run (needs macOS — CI workflow provided) |
| Real-Mac feasibility tests | **Not run** | Planned on a friend's Mac — `docs/feasibility-report.md` |
| Paddle, email provider, hosting, Apple Developer ID | **Not set up** | Needs your accounts |

The biggest open risk is still the core feature itself: whether pressing app menu commands through Accessibility is
reliable enough. Until the Mac tests pass, keep checkout off and don't publish any compatibility claim.

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
