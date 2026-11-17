# PlainClick — Product spec (v0, pre-feasibility)

## 1. The user problem, stated precisely

| Problem | Does PlainClick help? |
|---|---|
| **A. Controls are visually hard to distinguish** (icon-only, low-contrast, translucent) | **Partly.** It offers a second, plainly labelled place to trigger *some* commands in *supported* apps. The original toolbar looks exactly the same. |
| **B. Toolbars take too much space** | **No.** PlainClick cannot hide, shrink, or reclaim another app's toolbar. Some apps have their own "Hide Toolbar" or customise-toolbar options; we can point users to those, nothing more. |
| **C. Frequently used actions should be together in a simpler layout** | **Yes, within limits.** A pinned, reorderable set of tested actions per app. |

The website, onboarding, and FAQ must say clearly that the panel is separate and the app's toolbar stays the same.

Free alternatives users already have (we must mention these): System Settings → Accessibility → Display →
*Reduce transparency*, *Increase contrast*, *Show toolbar button shapes* where present, and each app's own keyboard
shortcuts. If these alone solve the problem for someone, that person should not need to pay.

## 2. What it is

A menu-bar utility. Press a configurable shortcut (prototype default: **⌃⌥Space**) → a small floating panel appears
showing the frontmost app's name and a short list of clearly labelled buttons. Clicking a button invokes that app's own
menu command through the macOS Accessibility API. The panel does not take focus from the target app.

## 3. Technical approach (chosen for Phase 0)

**Mechanism: press the target app's own menu-bar item with `AXUIElementPerformAction(item, kAXPressAction)`.**

Why menu items rather than toolbar buttons or keystrokes:

- Nearly every standard command a Mac app offers lives in its menu bar, so menu items are a more consistent target than toolbars.
- Menu items expose `AXEnabled`, so we can show "not available right now" instead of firing blindly.
- `AXPress` is sent to a specific process (by PID), so it can't land in whichever app happens to be frontmost, unlike
  synthetic keystrokes (`CGEvent`), which we do not use.
- No code injection, no SIP changes, no root, no private frameworks.

**How a command is identified (no English titles):**

1. `AXIdentifier` of the menu item, when the app sets one (many don't).
2. Otherwise its **keyboard-equivalent signature**: `AXMenuItemCmdChar` + `AXMenuItemCmdModifiers`
   (e.g. Safari *Back* = ⌘[). These stay the same across UI languages in most apps.
3. If zero or more than one enabled item matches → the action is shown as *unavailable* and is **not** pressed.

Titles are never used for matching. Known weaknesses: users can remap shortcuts (System Settings → Keyboard → Keyboard
Shortcuts → App Shortcuts), and some apps change shortcuts between versions. Both are tested and documented per app.

AppleScript / Apple Events were considered as a second mechanism (e.g. Safari `do JavaScript` for Back). Rejected for Phase 0:
it needs a separate Automation consent per app and runs in a web page's context. We can revisit it per app if menu pressing fails.

## 4. Riskiest assumptions (ranked) — Phase 0 must settle each

| # | Assumption | Why it is risky | How Phase 0 tests it |
|---|---|---|---|
| R1 | `AXPress` on a menu item that isn't open reliably runs the command in the target app's **current** window | Some apps validate or route commands differently when the menu isn't actually open | Protocol T1–T4, 20+ runs per action, with app and window switching |
| R2 | `AXEnabled` on an unopened menu item is **up to date** | AppKit checks which menu items are enabled lazily (`validateMenuItem`, mostly when a menu opens). The value may be stale, so we could show a button as enabled when the command can't actually run | T5: put the app into a state where the command can't run (e.g. no Back history), read the value, compare with the menu actually opened |
| R3 | Matching by shortcut finds exactly one item and works across UI languages | Shortcuts can be remapped, duplicated, or changed per version | T7 (second UI language), T8 (custom shortcut) |
| R4 | A non-activating panel leaves the target app and its key window untouched | If our panel takes focus, "Find"/"Save" would go to the wrong window or do nothing | T2/T3 window switching; check the key window before and after |
| R5 | Accessibility revocation is detected while running | TCC behaviour while an app is running has changed between macOS versions | T9 |
| R6 | Walking the whole menu tree is fast enough | Big menus (History, Bookmarks) can be slow over AX; hung target apps can block | Latency is logged per press; AX messaging timeout set to 1 s |
| R7 | People prefer this to free built-in settings and will pay $5.99 | Complaint threads don't prove anyone will buy | Phase 4 beta interviews + Phase 5 conversion data |

**Go/no-go rule:** If R1 or R4 fails for a candidate action, that action is dropped. If fewer than 3 actions across
2 apps pass, Phase 0 ends with a narrower proposal and **no payments work starts**.

## 5. Explicit non-claims (use this list when writing copy)

PlainClick does **not**: change or shrink native buttons; remove Liquid Glass or any system material; change any
app's toolbar; work with every app; provide any medical, eyesight, or headache benefit; carry Apple endorsement
(notarization is a malware scan, not an endorsement).

## 6. Phased checklist

Estimates are planning guesses, not deadlines.

### Phase 0 — Feasibility (≈3–5 working days, **needs a Mac**)
- [x] Workspace inspected; separate project folder created
- [x] Product limits and riskiest assumptions written (this doc)
- [x] Prototype source: menu-bar app, hotkey, non-activating panel, permission flow, AX resolver, guarded press, local trial log, command discovery
- [x] CI compile-check workflow written (`.github/workflows/macos-build.yml`) — not yet run; needs the repo pushed to GitHub
- [ ] Compile cleanly (CI or a Mac) and fix compile errors — **source has never been compiled**
- [ ] Obtain hands-on Mac access for behaviour testing (CI cannot grant Accessibility permission)
- [ ] Run protocol T1–T10 ([feasibility-report.md](feasibility-report.md)), ≥20 runs per main flow
- [ ] Record macOS build + app versions; fill compatibility matrix
- [ ] Screen-record a real demonstration
- [ ] Written go / narrow / no-go recommendation

> **2026-11-17 decision (owner):** build all phases now on Windows and test on a friend's Mac later. Phases 1–3 below
> were therefore built *before* the Phase 0 gate. The gate still decides what may be **published or sold**:
> checkout stays off and compatibility stays "being tested" until Phase 0 passes.

### Phase 1 — Native MVP (≈1–2 weeks) — source written, not compiled
- [x] Code written: menu bar (Open panel, Settings, Manage licence, Pause, Quit), per-app enable, pin/reorder, compact/comfortable, light/dark/system, optional icons, remembered position, VoiceOver labels, trial, licence UI, free appearance guide
- [ ] Keyboard navigation inside the panel (blocked by the no-focus design, see R4)
- [ ] Configurable shortcut (fixed ⌃⌥Space for now)

### Phase 1 original list
- [ ] Menu-bar items: Open panel, Settings, Manage licence, Pause, Quit
- [ ] Panel: labels + optional icons, compact/comfortable, light/dark/system, keyboard navigation, VoiceOver labels, visible focus, pin/reorder, remembered position, avoid covering the target window
- [ ] Per-app enable/disable, pinned actions, tested-command list, honest "not supported" state
- [ ] Free appearance guide (Reduce Transparency / Increase Contrast) — manual instructions unless a supported route to open Settings is confirmed
- [ ] Permission onboarding only when app control is enabled; revoke/uninstall instructions
- [ ] 7-day local trial (documented as not tamper-proof)
- [ ] Configurable shortcut

### Phase 2 — Website (≈3–5 days, can overlap once Phase 0 passes)
- [ ] Next.js + TypeScript + Tailwind; all pages listed in the brief; beta/waitlist state; checkout disabled; no download link until a real release exists

### Phase 3 — Payments & licensing (≈4–7 days)
- [ ] Provider abstraction + Paddle sandbox (after seller eligibility is confirmed)
- [ ] Verified webhooks, idempotent fulfilment, licence generation, durable email jobs
- [ ] Activate / validate / deactivate / recover endpoints; Ed25519-signed offline entitlement; 2-device atomic limit; rate limits

### Phase 4 — Beta & release (≈1–2 weeks)
- [ ] 10–20 beta users; fixes; Developer ID signing, hardened runtime, notarization, stapling; clean-Mac install test; real screenshots; public compatibility matrix; live-fulfilment test in sandbox

### Phase 5 — Launch
- [ ] Turn on live checkout only after the downloadable release works; honest demo video; measure trial→purchase and support load
