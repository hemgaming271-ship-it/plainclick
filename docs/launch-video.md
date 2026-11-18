# Launch video plan

## Rules (from the product brief)
- Only real footage of the real app. No mock-ups shown as the product, no sped-up "magic", no fake users or reviews.
- Never imply PlainClick changes the app's own toolbar or removes Liquid Glass. The app toolbar stays visible in every shot.
- Say which apps and actions are supported. Don't suggest it works everywhere.
- No medical or eyesight claims. No "Apple approved". Notarized ≠ endorsed.
- The final video must use a **signed, notarized release build** recorded after the release checklist passes.
  The current footage comes from an ad-hoc-signed prototype on a GitHub macOS 26 VM. That's fine for drafts and the beta page,
  but label it "pre-release build" if it's published.

## Source footage
`docs/video/plainclick-demo-macos26-raw.mov`: 1024×768, H.264, about 80–100 s. It's recorded automatically by `.github/workflows/demo-video.yml`
(the app's `--demo` mode drives the real hotkey, clicks and commands while `screencapture -v -C -k` records cursor and clicks).
Re-run the workflow from the Actions tab to record fresh footage after any UI change.

## Script (about 60 s cut)

| # | Scene (real footage) | On-screen caption | Voice-over (optional) |
|---|---|---|---|
| 1 | TextEdit, typing a note | **Your everyday Mac actions, made clearer.** | "PlainClick is a small panel of clearly labelled buttons for the Mac apps you use most." |
| 2 | ⌃⌥P, panel appears beside TextEdit | Press ⌃⌥P. A plain panel appears. TextEdit stays as it is. | "Press Control-Option-P. The app's own toolbar doesn't change." |
| 3 | Click **Save**; "Edited" disappears from the title | Click Save. TextEdit saves. | "Click Save, and TextEdit saves your document." |
| 4 | Keep typing in the document | Your typing stays in your document. | "Your cursor stays where you were working." |
| 5 | Click **Find**; "milk" highlighted | Find, in one clear click. | — |
| 6 | Safari: Reload, New Tab | Works with the actions we've tested in Safari, Finder and TextEdit. | "It offers only actions we've tested in each app." |
| 7 | Calculator: "isn't supported yet" | Honest about what it doesn't support. | "Other apps get an honest 'not supported' message." |
| 8 | ⌃⌥P closes the panel; end card | **PlainClick · US$5.99 one time · 7-day free trial** · plainclick website | "One price, no subscription. Try it free for seven days." |

End card small print: "Requires macOS 14 or later. Works with listed apps only. Not affiliated with Apple."
Before checkout opens, replace the price line with **"Join the beta"**.

## Launch video v1 (motion graphics) — `docs/video/plainclick-launch.mp4`
57.5 s, 1920×1080, 30 fps, H.264, no audio. Built by `tools/launch-video`:
- Every frame is rendered deterministically from `timeline.html` (headless Chrome/Edge → ffmpeg), so motion is perfectly smooth.
- Content is real. The screens are full-screen stills that the app's `--demo` mode captured on macOS 26 at each state.
  The panel is the app's own SwiftUI view rendered at 3×, in that same real state, placed at its real position (`assets/layout.json`).
- Presentation layer (clearly a presentation, not a recording): device frame, camera moves, an animated cursor/click,
  keycaps, captions, a feature grid and an end card. The end card's small print says the screens come from the pre-release build.
- Vertical 9:16 version for Reels / Shorts / TikTok: `docs/video/plainclick-launch-vertical.mp4` (`node render.mjs --vertical`).
- Music: an original track composed in code by `make-audio.mjs`: warm pad chords, a soft plucked pulse, and quiet UI clicks
  synced to the on-screen clicks. No samples or third-party music, so there's nothing to license. -15.4 LUFS, true peak -1.9 dBTP.
  To use a licensed track instead, save it as `assets/music.wav` (57.5 s) and re-render.
- Re-render: `cd tools/launch-video && npm install && node make-audio.mjs && node render.mjs` (needs ffmpeg + Chrome or Edge).
  Preview stills: `node render.mjs --preview` (optionally `--times 10,20,30`). Refresh assets from the `ci-demo` branch
  after running the "Demo footage" workflow.

## Production checklist
- [x] Raw real footage recorded on macOS 26 (CI VM), 2026-11-17 — `docs/video/plainclick-demo-macos26-raw.mov`
- [x] Rough cut with captions — `docs/video/plainclick-rough-cut.mp4` (1080p, about 100 s) + `.srt`, built by `docs/video/make-rough-cut.ps1`
- [ ] Tighten the cut to about 60 s (the Safari scene waits too long for the page; trim the dead time)
- [ ] Safari scene: use a page with visible content at 1024×768 (example.com looks blank at this size)
- [ ] Record final footage from the signed, notarized release build (ideally at a higher resolution)
- [ ] Voice-over (optional); background music only if licensed
- [ ] Export: 1080p MP4 (H.264), 16:9; plus a 9:16 vertical cut for social; captions burned in and as an .srt
- [ ] Check every claim against `docs/compatibility.md` on the day of publishing
