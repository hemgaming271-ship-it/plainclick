# Phase 0 feasibility report

**Status: NOT RUN.** No Mac has been used yet. Every result cell below is empty on purpose.
Do not quote anything from this file as a result until the cells are filled in from a real run, with logs to back them.

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
| T1 | Main flow ×20 | Per action: open panel with ⌃⌥Space, click action, observe effect | ≥20/20 effects in the correct app; log shows `pressed` |
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
