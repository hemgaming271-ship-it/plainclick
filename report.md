# PlainClick feasibility run

- Date (UTC): 2026-11-24T13:17:47Z
- macOS: Version 15.8.2 (Build 24H232)
- Accessibility trusted: true
- Apps: Finder 15.5 (1732.6.4.2), Safari 27.2 (20625.2.8.18.4), TextEdit 1.20 (409)
- Environment: GitHub-hosted macOS runner VM (unattended, single virtual display). Not a physical user Mac.

## Summary

| Test | App | Action | Runs | Pass | Fail | Median ms | Max ms |
|---|---|---|---|---|---|---|---|
| T0-discovery | TextEdit | Save | 1 | 1 | 0 | 57 | 57 |
| T0-discovery | TextEdit | Find | 1 | 1 | 0 | 753 | 753 |
| T0-discovery | Finder | Back | 1 | 1 | 0 | 46 | 46 |
| T0-discovery | Finder | Forward | 1 | 1 | 0 | 64 | 64 |
| T0-discovery | Finder | New Folder | 1 | 1 | 0 | 51 | 51 |
| T0-discovery | Safari | Back | 1 | 1 | 0 | 44 | 44 |
| T0-discovery | Safari | Forward | 1 | 1 | 0 | 54 | 54 |
| T0-discovery | Safari | Reload | 1 | 1 | 0 | 41 | 41 |
| T0-discovery | Safari | New Tab | 1 | 1 | 0 | 42 | 42 |
| T1-repeat | TextEdit | Save | 20 | 20 | 0 | 124 | 547 |
| T1-repeat | TextEdit | Find | 20 | 20 | 0 | 77 | 132 |
| T1-repeat | Finder | New Folder | 20 | 20 | 0 | 56 | 98 |
| T5-disabled | Finder | Back | 1 | 1 | 0 | 54 | 54 |
| T5-disabled | Finder | Forward | 1 | 1 | 0 | 34 | 34 |
| T7-R2-raw-state | Finder | Back | 1 | 0 | 1 | 0 | 0 |
| T7-R2-menu-refresh | Finder | Back | 1 | 1 | 0 | 0 | 0 |
| T7-R2-raw-after-refresh | Finder | Back | 1 | 1 | 0 | 0 | 0 |
| T7-force-press-available | Finder | Back | 1 | 1 | 0 | 0 | 0 |
| T7-R2-raw-state | Finder | Forward | 1 | 0 | 1 | 0 | 0 |
| T7-force-press-available | Finder | Forward | 1 | 0 | 1 | 0 | 0 |
| T7-force-press-unavailable | Finder | Forward | 1 | 0 | 1 | 0 | 0 |
| T2-wrong-app-guard | TextEdit->Finder | Find | 20 | 20 | 0 | 0 | 0 |
| T2-app-switching | Finder | New Folder | 10 | 10 | 0 | 54 | 99 |
| T2-app-switching | TextEdit | Save | 10 | 10 | 0 | 101 | 141 |
| T6-stale | TextEdit | Find | 5 | 5 | 0 | 244 | 400 |
| T1-repeat | Safari | Reload | 20 | 20 | 0 | 57 | 193 |
| T7-R2-raw-state | Safari | Back | 10 | 1 | 9 | 0 | 0 |
| T7-force-press-available | Safari | Back | 10 | 10 | 0 | 0 | 0 |
| T7-R2-raw-state | Safari | Forward | 10 | 0 | 10 | 0 | 0 |
| T7-R2-menu-refresh | Safari | Forward | 3 | 0 | 3 | 0 | 0 |
| T7-force-press-available | Safari | Forward | 10 | 0 | 10 | 0 | 0 |
| T7-force-press-unavailable | Safari | Forward | 1 | 1 | 0 | 0 | 0 |
| T1-repeat | Safari | New Tab | 20 | 20 | 0 | 55 | 189 |
| T0-discovery | Calculator | Basic | 1 | 1 | 0 | 16 | 16 |
| T0-discovery | Calculator | Scientific | 1 | 1 | 0 | 16 | 16 |
| T0-discovery | Calculator | Programmer | 1 | 1 | 0 | 16 | 16 |
| T0-discovery | Calculator | Copy Result | 1 | 1 | 0 | 15 | 15 |
| T1-repeat | Calculator | Scientific | 10 | 10 | 0 | 23 | 31 |
| T1-repeat | Calculator | Programmer | 10 | 10 | 0 | 30 | 46 |
| T1-repeat | Calculator | Basic | 10 | 10 | 0 | 34 | 44 |
| T1-repeat | Calculator | Copy Result | 20 | 20 | 0 | 18 | 35 |

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
- Calculator version: 11.0 (224)
- Calculator window sizes per mode: ["Scientific": "574x350", "Basic": "198x350", "Programmer": "418x518"]
