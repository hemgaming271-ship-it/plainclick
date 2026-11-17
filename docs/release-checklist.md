# Release checklist

Tick only what has actually been done, and record who did it and when. "CI" means GitHub-hosted macOS VMs, not a physical Mac.

## A. Feasibility gate (friend's Mac)
- [x] `./scripts/build-app.sh` builds; `swift test` passes — on GitHub Actions macOS runner, 2026-11-17 (CI only, not a real-Mac run)
- [ ] App launched on a real Mac; menu bar icon, panel and permission prompt appear
- [x] Automated feasibility (T0, T1, T2, T5, T6, R2 experiment) on macOS 15.8.2 and 26.7.2 — 2026-11-17, Actions run #3
- [x] 5 actions across 3 apps passed; `compatibility.md` and `src/lib/compatibility.ts` updated with macOS build and app versions
- [x] Decision written down: **narrow go** (Back/Forward dropped)
- [x] Real app UI test on macOS 15.8.2 + 26.7.2 (CI): hotkey, non-activating panel, real clicks on Find/Save, typing continues in the target (T4) — **17/17 on both OSes**, commit 76bfffb
- [ ] Manual tests on a physical Mac: T3 window switching, T8 remapped shortcut, T9 permission flow, T10 fullscreen, VoiceOver

## B. Native checks
- [ ] Permission accepted, refused, and revoked while running
- [x] App switching: zero commands sent to the wrong app — CI, 0/80 (window switching still manual)
- [x] Target app quit and relaunched (stale references) — CI, 5/5
- [x] Disabled controls: limitation documented; Back/Forward dropped (R2)
- [x] Panel never takes keyboard focus; typing continues in the target app — CI UI test, both OSes
- [ ] Fullscreen apps; two monitors; Spaces
- [ ] Light, dark, Increase Contrast, Reduce Transparency, larger text
- [ ] Sleep/wake with the panel open
- [ ] VoiceOver reads the target name and each button with its availability hint
- [ ] Trial: fresh install shows 7 days; ends correctly
- [ ] Licence: activate, invalid key, limit reached, deactivate, transfer to a second Mac
- [ ] Offline launch after activation still licensed; revoked licence removed on next online check

## C. Backend checks
- [x] Automated: invalid/stale signature, duplicate and retried webhooks, refund before/after fulfilment, wrong product/price/currency/discount/quantity, concurrent activations, forged and transplanted entitlements, email failure and retry, recovery single-use and expiry, rate limiting (`npm test`, 19 passing on 2026-11-17, Windows, PGlite)
- [ ] Same scenarios against real PostgreSQL with concurrent connections
- [ ] Sandbox Paddle webhooks captured and compared with the adapter's field mapping
- [ ] Real email delivered from the verified domain; not marked as spam

## D. Signing and notarization (needs Apple Developer Program, US$99/yr)
- [ ] Developer ID Application certificate in the keychain
- [ ] Bundle ID changed from `local.plainclick.prototype` to the final reverse-DNS ID you control
- [ ] `CODESIGN_IDENTITY="Developer ID Application: <Name> (<TEAMID>)" ./scripts/build-app.sh` (hardened runtime is already on)
- [ ] Package as a DMG or ZIP; `xcrun notarytool submit PlainClick.zip --keychain-profile <profile> --wait`
- [ ] `xcrun stapler staple "PlainClick.app"` (or the DMG)
- [ ] `spctl --assess --type execute --verbose "PlainClick.app"` shows "Notarized Developer ID"
- [ ] Download from the real URL on a **clean** Mac (new user account at minimum) and install without any Gatekeeper workaround
- [ ] `shasum -a 256` recorded; version, checksum and release notes published on `/changelog` and `/download`

## E. Website go-live
- [ ] Real support email works; seller legal name filled in; legal pages reviewed
- [ ] Mobile and desktop layouts; keyboard-only navigation; contrast checked
- [ ] Compatibility page shows only verified rows
- [ ] `NEXT_PUBLIC_RELEASE_AVAILABLE=true` with real download URL and checksum
- [ ] Sandbox: checkout success, cancel and failure paths; fulfilment end-to-end
- [ ] Only then: production Paddle keys + `NEXT_PUBLIC_CHECKOUT_ENABLED=true`
