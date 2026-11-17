# Phase 0 feasibility report

## Automated results — 2026-11-17 (real apps on GitHub-hosted macOS VMs)

No physical Mac was available, so the core mechanism was tested automatically. `plainclick-feasibility` (apps/macos/Sources/Feasibility)
drives the real TextEdit, Finder and Safari through the **same `PlainClickCore` code path the app uses**. It checks every
effect against observable state: file contents on disk, folder counts, window titles and AX elements.

| Field | macOS 15 job | macOS 26 job |
|---|---|---|
| macOS build | 15.8.2 (24H232) | 26.7.2 (25G332) — Tahoe / Liquid Glass |
| TextEdit / Finder / Safari | 1.20 (409) / 15.5 / 27.2 | 1.20 (415) / 26.4 / 27.2 |
| Accessibility trusted | yes (runner image grant) | yes |
| Evidence | Actions run #3 (`7e19fe7`), job summary + `feasibility-report-macos-15` artifact | same run, `feasibility-report-macos-26` |

| Test | What it proves | macOS 15 | macOS 26 |
|---|---|---|---|
| T0 discovery | All 9 candidates resolve to exactly one menu item by shortcut | 9/9 | 9/9 |
| T1 ×20 TextEdit Save | Typed text is saved to disk | 20/20 | 20/20 |
| T1 ×20 TextEdit Find | Find field appears | 20/20 | 20/20 |
| T1 ×20 Finder New Folder | Folder appears on disk | 20/20 | 20/20 |
| T1 ×20 Safari Reload | Page reloads | 20/20 | 20/20 |
| T1 ×20 Safari New Tab | New tab opens | 20/20 | 20/20 |
| T2 wrong-app guard ×20 | Command aimed at a background app is refused, with no side effects anywhere | 20/20 | 20/20 |
| T2 app switching ×20 | Alternating apps; each command lands only in the front app | 20/20, **0 wrong-app** | 20/20, **0 wrong-app** |
| T5 disabled | Fresh Finder window: Back/Forward correctly reported disabled and not sent | 2/2 | 2/2 |
| T6 stale ref ×5 | Old element after relaunch fails safely; fresh lookup works | 5/5 | 5/5 |
| T7 R2 raw state | Closed-menu AXEnabled matches reality for Back/Forward | **1/22** | **1/22** |
| T7 menu-open refresh | Opening the menu fixes the state | Finder 1/1, Safari **0/3** | same |
| T7 forced press | Pressing despite "disabled" | Safari Back 10/10, Safari Forward **0/10**, Finder mixed | same |

Latency (resolve + enabled check + press): median 40–105 ms, max 522 ms.

### Decision: **NARROW — go with 5 actions**
- **Ship:** TextEdit Save, TextEdit Find, Finder New Folder, Safari Reload, Safari New Tab. That is 5 actions across 3 apps, above the acceptance bar of 3 actions across 2 apps.
- **Drop:** Back/Forward in Safari and Finder (risk R2 confirmed). macOS only revalidates these menu items when the menu is opened. Pressing them is unreliable, and showing them would mean either wrong greyed-out buttons or silent no-ops. They stay in the catalog with `supported: false`, so the harness keeps measuring them.
- The wrong-app risk (R4, command landing in the wrong app) showed **zero** occurrences in 80 guarded or switching attempts across both OSes.

## Real app UI test (`--ui-test`), 2026-11-17

The real PlainClick app was driven on the same GitHub macOS 15.8.2 and 26.7.2 machines. The test used real system input:
the global hotkey sent as an HID event, real mouse clicks on the panel, and system-wide typing. Screenshots are in `docs/screenshots/macos-15|26/`.
**Final run (commit `76bfffb`): 17 of 17 checks passed on both macOS 15.8.2 and 26.7.2.**

| Check | Result |
|---|---|
| Hotkey ⌃⌥P registers, opens and hides the panel | PASS |
| Opening the panel doesn't steal focus from TextEdit | PASS |
| Panel shows the right target and only tested actions (Save, Find; Safari: Reload, New Tab) | PASS |
| Typing reaches TextEdit's document (environment check) | PASS |
| Real click on **Save** saves the typed text to the file on disk (engine 161 / 366 ms) | PASS |
| **Typing continues in TextEdit's document after clicking the panel (T4)** | PASS |
| Real click on **Find** opens TextEdit's find bar; TextEdit stays in front | PASS |
| Unsupported app (Calculator) gets the honest message | PASS |
| Trial shows 7 days on first use | PASS |
| Settings window opens (Apps / Panel / Licence / Free guide) | Screenshot captured |

Note: a click on the panel sometimes makes macOS briefly activate PlainClick (seen on the Save click, not on Find). The engine
handles this: it hands activation back to the target app, confirms it is in front, and only then sends the command. Typing
afterwards still lands in the target document (PASS above).

A failure along the way was a false alarm from the test, not the product: TextEdit auto-capitalised "milk" → "Milk", and the
check was case-sensitive.

### Bugs this test found and fixed (none were visible on Windows)
1. **⌃⌥Space conflicts with macOS's "Select next input source" shortcut.** The default is now **⌃⌥P**.
2. **Clicking the panel activated PlainClick and the button didn't fire.** The panel now uses the standard AppKit palette setup:
   `.nonactivatingPanel`, `becomesKeyOnlyIfNeeded`, a hosting view that never needs key, `acceptsFirstMouse`, and `defer: false`.
   The engine also still hands focus back to the target if PlainClick ever ends up in front.
3. Test-harness lessons:
   - dispatch app events while waiting
   - clear modifier flags on synthetic typing
   - never press your own SwiftUI button through Accessibility from a background thread (that crashed SwiftUI; real VoiceOver calls arrive on the main thread)
   - pause the panel's refresh timer while querying your own app through Accessibility (a stack sample showed an HIServices lock deadlock)
   - compare typed text case-insensitively

### Not covered by these runs (still needs a physical Mac)
The panel, hotkey and focus behaviour are now covered by the UI test above. Still not tested: VoiceOver used by a person. Also not tested:
- the permission grant / deny / revoke flow (T9), because the runner already had permission
- remapped shortcuts (T8) and a second UI language (T7-lang)
- full screen, multiple monitors, and sleep/wake
- testing by a person on real hardware

---

## Manual protocol (physical Mac) — not run yet

## Test environment (fill in)

| Field | Value |
|---|---|
| Mac model / chip | |
| macOS version + build (`sw_vers`) | |
| Xcode version (`xcodebuild -version`) | |
| Prototype commit / build date | |
| Signing used (ad-hoc / Apple Development) | |
| UI language(s) tested | |
| Safari version | |
| Finder version (follows macOS) | |
| TextEdit version | |

## Protocol

Run each test while the prototype is running. The CSV log (`~/Library/Logs/PlainClickPrototype/trials.csv`) is the
evidence. Attach it, plus a screen recording of T1–T4.

| ID | Test | Steps | Pass criteria |
|---|---|---|---|
| T0 | Discovery | Dump menu commands for each target app; check each catalog matcher resolves to exactly 1 item | Every catalog action resolves; matcher table updated |
| T1 | Main flow ×20 | Per action: open panel with ⌃⌥P, click action, observe effect | ≥20/20 effects in the correct app; log shows `pressed` |
| T2 | App switching ×20 | Alternate Safari ↔ Finder (⌘Tab and clicking) with panel open; press an action after each switch | Panel target name always matches the front app; command lands only there; zero wrong-app events |
| T3 | Window switching ×20 | Two Safari windows / two TextEdit docs; switch (⌘\` and click); press Reload / Find | Command acts on the window the user last focused; the target's key window does not change when the panel is clicked |
| T4 | Panel focus | With TextEdit caret in a doc, click panel buttons, then keep typing | Typing still goes to TextEdit without any re-click |
| T5 | Disabled state (R2) | Safari new tab with no history → Back; TextEdit with no unsaved changes → Save; compare panel state with the real menu opened by hand | Panel shows disabled exactly when the real menu does. **Record any mismatch: this decides whether "disable unavailable actions" is reliable** |
| T6 | Stale references | Show panel; quit & relaunch target; press action; also open/close windows between presses | No crash; first press after relaunch either works (re-resolve) or is refused with a message; nothing sent elsewhere |
| T7 | Second UI language | Set Safari/TextEdit to a non-English language (System Settings → General → Language & Region → Applications); repeat T1 ×5 | Matchers still resolve. Record languages tested |
| T8 | Remapped shortcut | Add an App Shortcut that changes Safari *Reload Page* to another key; reopen panel | Expected FAIL (shows "not found"). Confirms the documented limitation; nothing wrong is pressed |
| T9 | Permission | (a) first run, deny; (b) grant; (c) revoke while running; (d) relaunch after revocation | Panel shows "App control is off" within ~2 s of revocation; no AX press attempted; log shows `permission_revoked` / `refused_no_permission` |
| T10 | Fullscreen & Spaces | Target app fullscreen; press hotkey | Panel appears over fullscreen app; command works |
| T11 | Unsupported app | Front app = Notes (not in catalog) | Honest unsupported message; no buttons |
| T12 | Latency | From log | Median and p95 `latency_ms` per action recorded; flag anything >300 ms |

## Results (fill in)

| ID | App | Action | Runs | Pass | Fail | Notes / log rows |
|---|---|---|---|---|---|---|
| T1 | Safari | Back | | | | |
| T1 | Safari | Forward | | | | |
| T1 | Safari | Reload | | | | |
| T1 | Safari | New Tab | | | | |
| T1 | Finder | Back | | | | |
| T1 | Finder | New Folder | | | | |
| T1 | TextEdit | Save | | | | |
| T1 | TextEdit | Find | | | | |
| T2 | Safari ↔ Finder | mixed | | | | |
| T3 | Safari / TextEdit | Reload / Find | | | | |
| T4–T12 | | | | | | |

## Recommendation (fill in after testing)

- [ ] **Go**: at least 3 actions across 2 apps pass T1–T6 with zero wrong-app events.
- [ ] **Narrow**: only list actions that passed; drop "disable unavailable actions" if T5 shows stale state.
- [ ] **No-go**: AXPress or the focus model is unreliable. Stop before any website or payments work.

## Fallbacks if risks fail

- **R2 (stale `AXEnabled`) fails**: keep buttons enabled, and after the press say plainly "Sent; the app may ignore it if the command isn't available." Never promise accurate enabled states in marketing.
- **R4 (focus) fails**: stay mouse-only. Investigate `NSWindow.Level` and activation rules before adding keyboard support.
- **R3 (matching) fails for an app**: per app, try `AXIdentifier` or menu position as a matcher, versioned per app build. Otherwise drop the app.
- **AXPress unreliable for an app**: drop that app; consider documented AppleScript for that app only, with its own Automation consent.
