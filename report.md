# PlainClick feasibility run

- Date (UTC): 2026-11-18T10:11:53Z
- macOS: Version 26.7.2 (Build 25G332)
- Accessibility trusted: true
- Apps: Finder 26.4 (1828.6.1), Safari 27.2 (21625.2.8.18.4), TextEdit 1.20 (415)
- Environment: GitHub-hosted macOS runner VM (unattended, single virtual display). Not a physical user Mac.

## Summary

| Test | App | Action | Runs | Pass | Fail | Median ms | Max ms |
|---|---|---|---|---|---|---|---|
| T0-discovery | TextEdit | Save | 1 | 1 | 0 | 24 | 24 |
| T0-discovery | TextEdit | Find | 1 | 1 | 0 | 31 | 31 |
| T0-discovery | Finder | Back | 1 | 1 | 0 | 53 | 53 |
| T0-discovery | Finder | Forward | 1 | 1 | 0 | 70 | 70 |
| T0-discovery | Finder | New Folder | 1 | 1 | 0 | 59 | 59 |
| T0-discovery | Safari | Back | 1 | 1 | 0 | 41 | 41 |
| T0-discovery | Safari | Forward | 1 | 1 | 0 | 44 | 44 |
| T0-discovery | Safari | Reload | 1 | 1 | 0 | 43 | 43 |
| T0-discovery | Safari | New Tab | 1 | 1 | 0 | 52 | 52 |
| T1-repeat | TextEdit | Save | 20 | 20 | 0 | 110 | 1264 |
| T1-repeat | TextEdit | Find | 20 | 20 | 0 | 84 | 168 |
| T1-repeat | Finder | New Folder | 20 | 20 | 0 | 58 | 106 |
| T5-disabled | Finder | Back | 1 | 1 | 0 | 53 | 53 |
| T5-disabled | Finder | Forward | 1 | 1 | 0 | 33 | 33 |
| T7-R2-raw-state | Finder | Back | 1 | 0 | 1 | 0 | 0 |
| T7-R2-menu-refresh | Finder | Back | 1 | 1 | 0 | 0 | 0 |
| T7-R2-raw-after-refresh | Finder | Back | 1 | 1 | 0 | 0 | 0 |
| T7-force-press-available | Finder | Back | 1 | 1 | 0 | 0 | 0 |
| T7-R2-raw-state | Finder | Forward | 1 | 0 | 1 | 0 | 0 |
| T7-force-press-available | Finder | Forward | 1 | 0 | 1 | 0 | 0 |
| T7-force-press-unavailable | Finder | Forward | 1 | 0 | 1 | 0 | 0 |
| T2-wrong-app-guard | TextEdit->Finder | Find | 20 | 20 | 0 | 0 | 10 |
| T2-app-switching | Finder | New Folder | 10 | 10 | 0 | 61 | 67 |
| T2-app-switching | TextEdit | Save | 10 | 10 | 0 | 113 | 120 |
| T6-stale | TextEdit | Find | 5 | 5 | 0 | 221 | 241 |
| T1-repeat | Safari | Reload | 20 | 20 | 0 | 69 | 200 |
| T7-R2-raw-state | Safari | Back | 10 | 1 | 9 | 0 | 0 |
| T7-force-press-available | Safari | Back | 10 | 10 | 0 | 0 | 0 |
| T7-R2-raw-state | Safari | Forward | 10 | 0 | 10 | 0 | 0 |
| T7-R2-menu-refresh | Safari | Forward | 3 | 0 | 3 | 0 | 0 |
| T7-force-press-available | Safari | Forward | 10 | 0 | 10 | 0 | 0 |
| T7-force-press-unavailable | Safari | Forward | 1 | 1 | 0 | 0 | 0 |
| T1-repeat | Safari | New Tab | 20 | 20 | 0 | 62 | 128 |
| T0-discovery | Calculator | Basic | 1 | 1 | 0 | 15 | 15 |
| T0-discovery | Calculator | Scientific | 1 | 1 | 0 | 14 | 14 |
| T0-discovery | Calculator | Programmer | 1 | 1 | 0 | 15 | 15 |
| T0-discovery | Calculator | Copy Result | 1 | 1 | 0 | 15 | 15 |
| T1-repeat | Calculator | Scientific | 10 | 10 | 0 | 45 | 48 |
| T1-repeat | Calculator | Programmer | 10 | 10 | 0 | 44 | 49 |
| T1-repeat | Calculator | Basic | 10 | 10 | 0 | 45 | 50 |
| T1-repeat | Calculator | Copy Result | 20 | 20 | 0 | 34 | 37 |

## Failures (36)

- T7-R2-raw-state | Finder | Back #1: raw=disabled truth=enabled - 
- T7-R2-raw-state | Finder | Forward #1: raw=disabled truth=enabled - 
- T7-force-press-available | Finder | Forward #1: forced:success - -> Recents
- T7-force-press-unavailable | Finder | Forward #1: forced:success - title stays Applications
- T7-R2-raw-state | Safari | Forward #1: raw=disabled truth=enabled - 
- T7-R2-menu-refresh | Safari | Forward #1: refreshed=disabled truth=enabled - 
- T7-force-press-available | Safari | Forward #1: forced:success - title=PC-A
- T7-R2-raw-state | Safari | Back #2: raw=disabled truth=enabled - 
- T7-R2-raw-state | Safari | Forward #2: raw=disabled truth=enabled - 
- T7-R2-menu-refresh | Safari | Forward #2: refreshed=disabled truth=enabled - 
- T7-force-press-available | Safari | Forward #2: forced:success - title=PC-A
- T7-R2-raw-state | Safari | Back #3: raw=disabled truth=enabled - 
- T7-R2-raw-state | Safari | Forward #3: raw=disabled truth=enabled - 
- T7-R2-menu-refresh | Safari | Forward #3: refreshed=disabled truth=enabled - 
- T7-force-press-available | Safari | Forward #3: forced:success - title=PC-A
- T7-R2-raw-state | Safari | Back #4: raw=disabled truth=enabled - 
- T7-R2-raw-state | Safari | Forward #4: raw=disabled truth=enabled - 
- T7-force-press-available | Safari | Forward #4: forced:success - title=PC-A
- T7-R2-raw-state | Safari | Back #5: raw=disabled truth=enabled - 
- T7-R2-raw-state | Safari | Forward #5: raw=disabled truth=enabled - 
- T7-force-press-available | Safari | Forward #5: forced:success - title=PC-A
- T7-R2-raw-state | Safari | Back #6: raw=disabled truth=enabled - 
- T7-R2-raw-state | Safari | Forward #6: raw=disabled truth=enabled - 
- T7-force-press-available | Safari | Forward #6: forced:success - title=PC-A
- T7-R2-raw-state | Safari | Back #7: raw=disabled truth=enabled - 
- T7-R2-raw-state | Safari | Forward #7: raw=disabled truth=enabled - 
- T7-force-press-available | Safari | Forward #7: forced:success - title=PC-A
- T7-R2-raw-state | Safari | Back #8: raw=disabled truth=enabled - 
- T7-R2-raw-state | Safari | Forward #8: raw=disabled truth=enabled - 
- T7-force-press-available | Safari | Forward #8: forced:success - title=PC-A
- T7-R2-raw-state | Safari | Back #9: raw=disabled truth=enabled - 
- T7-R2-raw-state | Safari | Forward #9: raw=disabled truth=enabled - 
- T7-force-press-available | Safari | Forward #9: forced:success - title=PC-A
- T7-R2-raw-state | Safari | Back #10: raw=disabled truth=enabled - 
- T7-R2-raw-state | Safari | Forward #10: raw=disabled truth=enabled - 
- T7-force-press-available | Safari | Forward #10: forced:success - title=PC-A

## Notes

- Finder history setup: Go to Applications pressed, title Recents -> Applications
- Wrong-app events during app switching: 0
- Calculator version: 12.0 (225)
- Calculator window sizes per mode: ["Scientific": "674x408", "Basic": "230x408", "Programmer": "488x582"]
