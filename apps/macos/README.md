# PlainClick — Phase 0 native prototype

**Status: source written on Windows. Never compiled or run. Expect compile fixes on first Mac build.**

## What it does

- Menu-bar-only app (`LSUIElement`). Global shortcut **⌃⌥Space** shows or hides the panel.
- The panel is a **non-activating** `NSPanel` that never becomes key, so the target app stays frontmost and keeps its key window.
- It shows the target app's name and, for Safari, Finder, and TextEdit, a few labelled buttons ([ActionCatalog.swift](Sources/PlainClickPrototype/ActionCatalog.swift)).
- A button finds the matching **menu-bar item** of the target app by `AXIdentifier` or key-equivalent signature (never its title), checks `AXEnabled`, then sends `AXPress` to that process only.
- Safety checks before every press ([Engine.swift](Sources/PlainClickPrototype/Engine.swift) `perform`):
  not paused → Accessibility permission still granted → the frontmost app is still the panel's target → exactly one matching item → enabled.
  If the cached reference is stale, it looks the item up again once and retries once. Otherwise **nothing is sent**.
- Permission is requested only when you click **Turn on app control…**. A grant or revocation is detected within about 2 s.
- Every attempt is appended to `~/Library/Logs/PlainClickPrototype/trials.csv`: bundle ID, app version, macOS build, action, outcome, and latency. No titles, URLs, or document text are logged.
- **Developer: Dump Menu Commands of Front App** writes a local TSV of the front app's menu items that have shortcuts or identifiers. Use it to confirm or correct the matchers. It includes menu titles, so review it before sharing.

## Build and run (on a Mac)

```bash
cd apps/macos
chmod +x scripts/build-app.sh
./scripts/build-app.sh
open "build/PlainClick Prototype.app"
```

Requirements: macOS 14+ and Xcode 16+ (Swift 5.10+ toolchain). Check what you have with `sw_vers` and `xcodebuild -version`, and record both in the feasibility report.

First run:
1. Click the menu-bar icon → **Turn on app control…** → macOS shows its own prompt → System Settings → Privacy & Security → Accessibility → enable *PlainClick Prototype*.
2. Open Safari, press ⌃⌥Space, and try Back, Reload, and New Tab.
3. Before trusting any default matcher, run **Developer: Dump Menu Commands of Front App** in each target app and update `ActionCatalog.swift`. Use identifiers where the dump shows them.

To revoke: System Settings → Privacy & Security → Accessibility → turn off or remove *PlainClick Prototype*. To uninstall, quit it, delete the .app, and delete `~/Library/Logs/PlainClickPrototype`.

## Known design limits (to be confirmed by testing)

- Mouse only. The panel never takes keyboard focus. Keyboard navigation needs a separate design in Phase 1.
- `AXEnabled` on a closed menu may be stale (risk R2). A button can look enabled when the command won't run.
- Matching by shortcut breaks if the user remaps that shortcut, or if the app has two items with the same shortcut. In the second case the action is refused, not guessed.
- Labels are English only for now.
