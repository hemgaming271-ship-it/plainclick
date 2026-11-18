# PlainClick app UI test

- macOS: Version 26.7.2 (Build 25G332)
- Result: 19/19 checks passed

| Check | Result | Detail |
|---|---|---|
| environment | PASS | macOS Version 26.7.2 (Build 25G332); AX trusted=true |
| typing reaches TextEdit before panel use | PASS | text arrived |
| hotkey registered | PASS | RegisterEventHotKey for Ctrl-Option-P |
| hotkey opens panel | PASS | Ctrl-Option-P via HID event |
| panel does not steal focus | PASS | front=com.apple.TextEdit, PlainClick active=false |
| panel shows target | PASS | target=TextEdit |
| panel shows tested actions | PASS | buttons=["Save", "Find"] |
| click Save button | PASS | file on disk updated; status="Save sent to TextEdit." mouse=["down@PlainClick clicks=1 active=true", "up@PlainClick clicks=1 active=true"] |
| typing continues in TextEdit after panel click | PASS | text arrived in the document; front=com.apple.TextEdit |
| click Find button | PASS | find field appeared=true; status="Find sent to TextEdit." |
| target app in front after click | PASS | front=com.apple.TextEdit PlainClick active=false panelKey=false |
| diagnostic: click | PASS | button frame=(740.0, 184.0, 228.0, 32.0) panel frame(AppKit)=(724.0, 484.0, 260.0, 213.0) mouse events seen=["down@PlainClick clicks=1 active=false", "up@PlainClick clicks=1 active=false"] nonactivating=true floating=true |
| diagnostic: last engine log rows | PASS | "2026-11-18T10:01:12Z","Version 26.7.2 (Build 25G332)","none","unknown","-","launched","0","trusted" / "2026-11-18T10:01:22Z","Version 26.7.2 (Build 25G332)","com.apple.TextEdit","1.20 (415)","textedit.save","pressed","208","" / "2026-11-18T10:01:24Z","Version 26.7.2 (Build 25G332)","com.apple.TextEdit","1.20 (415)","textedit.find","pressed","295","" |
| Calculator shows tested actions | PASS | buttons=["Basic", "Scientific", "Programmer", "Copy Result"] |
| click Scientific in Calculator | PASS | width 230 -> 674; status="Scientific sent to Calculator." |
| unsupported app message | PASS | target=Stickies supported=false |
| Safari actions exclude Back/Forward | PASS | buttons=["Reload", "New Tab"] |
| trial active on first use | PASS | state=trial(daysLeft: 7) |
| hotkey hides panel | PASS | visible=false |

## Screenshots

- 01-screen-textedit-with-panel.png (full-screen capture, 99 KB)
- panel-textedit-light.png (render of the app's PanelView)
- panel-textedit-dark.png (render of the app's PanelView)
- 02a-screen-after-save.png (full-screen capture, 102 KB)
- 02-screen-after-find.png (full-screen capture, 105 KB)
- 03-screen-unsupported.png (full-screen capture, 167 KB)
- panel-unsupported.png (render of the app's PanelView)
- panel-safari-dark.png (render of the app's PanelView)
- panel-safari-compact.png (render of the app's PanelView)
- 04-screen-settings.png (full-screen capture, 228 KB)
