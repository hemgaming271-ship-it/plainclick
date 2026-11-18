# Compatibility

Source runs: GitHub Actions "Feasibility (real apps on macOS)" #3, 2026-11-17, commit `7e19fe7`. Both jobs passed.
The environment is GitHub-hosted macOS VMs running the real Apple apps, unattended, on one virtual display.
**Not yet confirmed by hand on a physical Mac.**

| App | Action | Matcher | macOS tested | App version | Result | Status |
|---|---|---|---|---|---|---|
| TextEdit | Save | ⌘S | 15.8.2 (24H232), 26.7.2 (25G332) | 1.20 (409 / 415) | 20/20 + 10/10 app-switching, on each OS; file on disk updated every time | **Automated pass** |
| TextEdit | Find | ⌘F | same | same | 20/20 on each OS; find field appears; 5/5 stale-reference recovery | **Automated pass** |
| Finder | New Folder | ⇧⌘N | same | 15.5 / 26.4 | 20/20 + 10/10 app-switching, on each OS; folder created on disk | **Automated pass** |
| Safari | Reload | ⌘R | same | 27.2 | 20/20 on each OS; page reloaded (timestamped title changed) | **Automated pass** |
| Safari | New Tab | ⌘T | same | 27.2 | 20/20 on each OS | **Automated pass** |
| Calculator | Basic | ⌘1 (View) | same | 11.0 (224) / 12.0 (225) | 10/10 on each OS; window resized to Basic (macOS 26: 230×408) | **Automated pass** (2026-11-18) |
| Calculator | Scientific | ⌘2 (View) | same | same | 10/10 on each OS; window resized to Scientific (674×408) | **Automated pass** |
| Calculator | Programmer | ⌘3 (View) | same | same | 10/10 on each OS; window resized to Programmer (488×582) | **Automated pass** |
| Calculator | Copy Result | ⌘C (Edit › Copy, `copy:`) | same | same | 20/20 on each OS; the typed number was on the clipboard every time | **Automated pass** |
| Safari | Back | ⌘[ | same | 27.2 | Closed-menu AXEnabled was wrong 9/10; a forced press worked 10/10 | **Dropped** (R2) |
| Safari | Forward | ⌘] | same | 27.2 | AXEnabled wrong 10/10; a menu-open refresh was still wrong 3/3; a forced press had no effect 10/10 | **Dropped** (R2) |
| Finder | Back | ⌘[ | same | 15.5 / 26.4 | AXEnabled wrong after navigation; a menu-open refresh corrected it; a forced press worked | **Dropped** (R2) |
| Finder | Forward | ⌘] | same | 15.5 / 26.4 | AXEnabled wrong; the first forced press had no effect, the second took effect | **Dropped** (R2) |

Cross-cutting results on both OSes: every candidate resolved to exactly one menu item (T0). The wrong-app guard refused
20/20 with no side effects. App switching had **0 wrong-app events in 20**. Median latency was 40–105 ms and the maximum 522 ms (TextEdit Save).

Status values: Candidate → Automated pass → Verified on a Mac / Limited / Dropped.

## Known limitations
- If you remap a command's keyboard shortcut in System Settings, PlainClick may stop finding it. Not yet tested.
- Only the default UI language of the runners was tested (English).
- PlainClick never changes the app's own toolbar.
