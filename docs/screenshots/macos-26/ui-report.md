# PlainClick app UI test

- macOS: Version 26.7.2 (Build 25G332)
- Result: 15/17 checks passed

| Check | Result | Detail |
|---|---|---|
| environment | PASS | macOS Version 26.7.2 (Build 25G332); AX trusted=true |
| hotkey registered | PASS | RegisterEventHotKey for Ctrl-Option-P |
| hotkey opens panel | PASS | Ctrl-Option-P via HID event |
| panel does not steal focus | PASS | front=com.apple.TextEdit, PlainClick active=false |
| panel shows target | PASS | target=TextEdit |
| panel shows tested actions | PASS | buttons=["Save", "Find"] |
| typing reaches TextEdit before panel use | FAIL | text did not arrive (environment check) |
| click Save button | FAIL | file not updated; status="Save sent to TextEdit." mouse=["down@PlainClick clicks=1 active=false", "up@PlainClick clicks=1 active=false"] |
| typing continues in TextEdit after panel click | PASS | text arrived in the document; front=com.apple.TextEdit |
| click Find button | PASS | find field appeared=true; status="Find sent to TextEdit." |
| target app in front after click | PASS | front=com.apple.TextEdit PlainClick active=false panelKey=false |
| diagnostic: click | PASS | button frame=(740.0, 184.0, 228.0, 32.0) panel frame(AppKit)=(724.0, 484.0, 260.0, 213.0) mouse events seen=["down@PlainClick clicks=1 active=false", "up@PlainClick clicks=1 active=false"] nonactivating=true floating=true |
| diagnostic: last engine log rows | PASS | "2026-11-17T12:21:02Z","Version 26.7.2 (Build 25G332)","none","unknown","-","launched","0","trusted" / "2026-11-17T12:21:12Z","Version 26.7.2 (Build 25G332)","com.apple.TextEdit","1.20 (415)","textedit.save","pressed","64","" / "2026-11-17T12:21:19Z","Version 26.7.2 (Build 25G332)","com.apple.TextEdit","1.20 (415)","textedit.find","pressed","170","" |
| unsupported app message | PASS | target=Calculator supported=false |
| Safari actions exclude Back/Forward | PASS | buttons=["Reload", "New Tab"] |
| trial active on first use | PASS | state=trial(daysLeft: 7) |
| hotkey hides panel | PASS | visible=false |

## Screenshots

- 01-screen-textedit-with-panel.png (full-screen capture, 96 KB)
- panel-textedit-light.png (render of the app's PanelView)
- panel-textedit-dark.png (render of the app's PanelView)
- 02-screen-after-find.png (full-screen capture, 103 KB)
- 03-screen-unsupported.png (full-screen capture, 140 KB)
- panel-unsupported.png (render of the app's PanelView)
- panel-safari-dark.png (render of the app's PanelView)
- panel-safari-compact.png (render of the app's PanelView)
- 04-screen-settings.png (full-screen capture, 219 KB)
