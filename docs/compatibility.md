# Compatibility

**No combination below has been tested.** This is the Phase 0 candidate list, not a support claim.
Only rows marked **Verified**, with a macOS build and an app version, may be published on the website.

| App | Action | Matcher (current hypothesis) | macOS build | App version | Languages | Status |
|---|---|---|---|---|---|---|
| Safari | Back | ⌘[ | — | — | — | Candidate |
| Safari | Forward | ⌘] | — | — | — | Candidate |
| Safari | Reload | ⌘R | — | — | — | Candidate |
| Safari | New Tab | ⌘T | — | — | — | Candidate |
| Finder | Back | ⌘[ | — | — | — | Candidate |
| Finder | Forward | ⌘] | — | — | — | Candidate |
| Finder | New Folder | ⇧⌘N | — | — | — | Candidate |
| TextEdit | Save | ⌘S | — | — | — | Candidate |
| TextEdit | Find | ⌘F | — | — | — | Candidate |

Status values: Candidate → Verified (passed T1–T6) / Limited (passed with a documented caveat) / Dropped (with reason).

## Known limitations (apply to all apps)
- If you remap a command's keyboard shortcut in System Settings, PlainClick may stop finding that command.
- PlainClick does not change, hide, or shrink the app's own toolbar.
- Other apps are not supported, even if they have similar menus.
