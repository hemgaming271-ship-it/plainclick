// PlainClick Phase 0 - automated feasibility harness.
//
// Drives REAL TextEdit, Finder and Safari through the same PlainClickCore path the app uses
// (resolve by shortcut signature -> check AXEnabled -> AXPress, guarded by "target must be frontmost"),
// and verifies each effect by observable state (file contents on disk, folder counts, window titles, AX elements).
//
// Test-only helpers (typing into TextEdit, pressing Escape, closing tabs) use CGEvent posted to a specific PID or
// extra menu presses. The product itself never synthesises keystrokes.
//
// Usage: plainclick-feasibility <output-dir>
// Writes results.json, report.md and menu dumps. Exit code is always 0 unless the harness itself crashes:
// the report is the result.

import AppKit
import ApplicationServices
import Foundation
import PlainClickCore

setvbuf(stdout, nil, _IONBF, 0)

// MARK: - Output

struct Row: Codable {
    let test: String
    let app: String
    let action: String
    let run: Int
    let outcome: String
    let pass: Bool
    let latencyMs: Int
    let detail: String
}

let outDir = URL(fileURLWithPath: CommandLine.arguments.dropFirst().first ?? "feasibility-out", isDirectory: true)
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
var rows: [Row] = []
var notes: [String] = []

func record(_ test: String, _ app: String, _ action: String, _ run: Int, _ outcome: String, _ pass: Bool, _ ms: Int = 0, _ detail: String = "") {
    rows.append(Row(test: test, app: app, action: action, run: run, outcome: outcome, pass: pass, latencyMs: ms, detail: detail))
    print("\(pass ? "PASS" : "FAIL") \(test) \(app) \(action) #\(run) \(outcome) \(ms)ms \(detail)")
}

// MARK: - Helpers

func pump(_ seconds: Double) { RunLoop.current.run(until: Date().addingTimeInterval(seconds)) }

@discardableResult
func waitUntil(_ timeout: Double, _ condition: () -> Bool) -> Bool {
    let end = Date().addingTimeInterval(timeout)
    while Date() < end {
        if condition() { return true }
        pump(0.1)
    }
    return condition()
}

func run(_ path: String, _ args: [String]) {
    let p = Process()
    p.executableURL = URL(fileURLWithPath: path)
    p.arguments = args
    try? p.run()
    p.waitUntilExit()
}

func runningApp(_ bundleID: String) -> NSRunningApplication? {
    NSRunningApplication.runningApplications(withBundleIdentifier: bundleID).first { !$0.isTerminated }
}

func appVersion(_ bundleID: String) -> String {
    guard let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleID),
          let info = Bundle(url: url)?.infoDictionary else { return "unknown" }
    return "\(info["CFBundleShortVersionString"] as? String ?? "?") (\(info["CFBundleVersion"] as? String ?? "?"))"
}

func frontPID() -> pid_t? { AX.focusedApplicationPID() ?? NSWorkspace.shared.frontmostApplication?.processIdentifier }

/// Uses LaunchServices (`open`) to launch/activate - reliable from a background process on macOS 14+.
@discardableResult
func bringToFront(_ bundleID: String, open args: [String]) -> pid_t? {
    run("/usr/bin/open", args)
    var pid: pid_t?
    waitUntil(20) {
        pid = runningApp(bundleID)?.processIdentifier
        return pid != nil && frontPID() == pid
    }
    pump(0.4)
    return pid
}

func ms(since start: Date) -> Int { Int(Date().timeIntervalSince(start) * 1000) }

func focusedWindow(_ pid: pid_t) -> AXUIElement? {
    let app = AX.app(pid: pid)
    return AX.element(app, kAXFocusedWindowAttribute as String) ?? AX.element(app, kAXMainWindowAttribute as String)
}

func windowTitle(_ pid: pid_t) -> String { focusedWindow(pid).flatMap { AX.string($0, kAXTitleAttribute as String) } ?? "" }

/// Breadth-first search for a descendant matching `match`, limited to keep it fast.
func findDescendant(_ root: AXUIElement, limit: Int = 4000, _ match: (AXUIElement) -> Bool) -> AXUIElement? {
    var queue = [root]
    var seen = 0
    while !queue.isEmpty, seen < limit {
        let el = queue.removeFirst()
        seen += 1
        if match(el) { return el }
        queue.append(contentsOf: AX.children(el))
    }
    return nil
}

func role(_ el: AXUIElement) -> String { AX.string(el, kAXRoleAttribute as String) ?? "" }
func subrole(_ el: AXUIElement) -> String { AX.string(el, kAXSubroleAttribute as String) ?? "" }

/// Test-only: type text into a specific process (not the product's mechanism).
func typeText(_ text: String, to pid: pid_t) {
    let src = CGEventSource(stateID: .hidSystemState)
    for scalar in text.utf16 {
        var ch = scalar
        for down in [true, false] {
            if let e = CGEvent(keyboardEventSource: src, virtualKey: 0, keyDown: down) {
                e.keyboardSetUnicodeString(stringLength: 1, unicodeString: &ch)
                e.postToPid(pid)
            }
        }
        pump(0.02)
    }
}

/// Test-only: press a key (e.g. 53 = Escape, 36 = Return) in a specific process.
func pressKey(_ code: CGKeyCode, to pid: pid_t) {
    let src = CGEventSource(stateID: .hidSystemState)
    for down in [true, false] {
        CGEvent(keyboardEventSource: src, virtualKey: code, keyDown: down)?.postToPid(pid)
    }
    pump(0.2)
}

func subfolderCount(_ dir: URL) -> Int {
    ((try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.isDirectoryKey])) ?? [])
        .filter { (try? $0.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true }.count
}

func dumpMenus(_ name: String, pid: pid_t) {
    let app = AX.app(pid: pid)
    guard let bar = AX.element(app, kAXMenuBarAttribute as String) else {
        notes.append("\(name): menu bar not readable")
        return
    }
    var lines = ["# \(name) - path\tcmdChar\tmodifiers\tidentifier\tenabled\ttitle"]
    func walk(_ el: AXUIElement, _ path: String, _ depth: Int) {
        guard depth < 6 else { return }
        for (i, c) in AX.children(el).enumerated() {
            let p = path.isEmpty ? "\(i)" : "\(path).\(i)"
            if role(c) == (kAXMenuItemRole as String) {
                let ch = AX.string(c, kAXMenuItemCmdCharAttribute as String) ?? ""
                let ident = AX.string(c, kAXIdentifierAttribute as String) ?? ""
                if !ch.isEmpty || !ident.isEmpty {
                    let mods = AX.int(c, kAXMenuItemCmdModifiersAttribute as String) ?? 0
                    var en = "?"
                    if case .value(let b) = AX.bool(c, kAXEnabledAttribute as String) { en = b ? "yes" : "no" }
                    lines.append("\(p)\t\(ch)\t\(mods)\t\(ident)\t\(en)\t\(AX.string(c, kAXTitleAttribute as String) ?? "")")
                }
            }
            walk(c, p, depth + 1)
        }
    }
    walk(bar, "", 0)
    try? lines.joined(separator: "\n").write(to: outDir.appendingPathComponent("menu-\(name).tsv"), atomically: true, encoding: .utf8)
}

/// Runs one action through the shared guarded path, timing it.
func attempt(_ def: ActionDefinition, target: pid_t) -> (PressOutcome, Int) {
    let start = Date()
    let outcome = CommandRunner.perform(def, targetPID: target, frontmostPID: frontPID())
    return (outcome, ms(since: start))
}

// MARK: - Fixtures

let base = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("pcfeas-\(Int(Date().timeIntervalSince1970))", isDirectory: true)
let folderA = base.appendingPathComponent("FolderA", isDirectory: true)
let docURL = base.appendingPathComponent("doc.txt")
let pageA = base.appendingPathComponent("a.html")
let pageB = base.appendingPathComponent("b.html")
try? FileManager.default.createDirectory(at: folderA, withIntermediateDirectories: true)
try? "start\n".write(to: docURL, atomically: true, encoding: .utf8)
try? """
<!doctype html><title>PC-A</title><p>Page A</p>
<script>
// Navigate only after load + delay, so Safari records a real history entry (an in-load script redirect replaces it).
window.addEventListener('load', function () {
  if (!sessionStorage.getItem('v')) { sessionStorage.setItem('v', '1'); setTimeout(function () { location.href = 'b.html'; }, 1500); }
});
</script>
""".write(to: pageA, atomically: true, encoding: .utf8)
try? """
<!doctype html><title>PC-B</title><p>Page B</p><script>document.title = 'PC-B ' + Date.now();</script>
""".write(to: pageB, atomically: true, encoding: .utf8)

let te = ActionCatalog.adapter(for: "com.apple.TextEdit")!
let fi = ActionCatalog.adapter(for: "com.apple.finder")!
let sa = ActionCatalog.adapter(for: "com.apple.Safari")!

// MARK: - Environment

let trusted = AXIsProcessTrusted()
let osVersion = ProcessInfo.processInfo.operatingSystemVersionString
print("macOS: \(osVersion)\nAccessibility trusted: \(trusted)")
// Global AX timeout so a call into a busy app (e.g. one tracking an open menu) can't stall the run.
AXUIElementSetMessagingTimeout(AXUIElementCreateSystemWide(), 2.0)
let versions = [
    "TextEdit": appVersion(te.bundleID),
    "Finder": appVersion(fi.bundleID),
    "Safari": appVersion(sa.bundleID),
]

func writeReport() {
    let enc = JSONEncoder()
    enc.outputFormatting = [.prettyPrinted, .sortedKeys]
    try? enc.encode(rows).write(to: outDir.appendingPathComponent("results.json"))

    var md = ["# PlainClick feasibility run", "",
              "- Date (UTC): \(ISO8601DateFormatter().string(from: Date()))",
              "- macOS: \(osVersion)",
              "- Accessibility trusted: \(trusted)",
              "- Apps: " + versions.sorted { $0.key < $1.key }.map { "\($0.key) \($0.value)" }.joined(separator: ", "),
              "- Environment: GitHub-hosted macOS runner VM (unattended, single virtual display). Not a physical user Mac.",
              "", "## Summary", "", "| Test | App | Action | Runs | Pass | Fail | Median ms | Max ms |", "|---|---|---|---|---|---|---|---|"]
    var groups: [String: [Row]] = [:]
    var order: [String] = []
    for r in rows {
        let k = "\(r.test)|\(r.app)|\(r.action)"
        if groups[k] == nil { order.append(k) }
        groups[k, default: []].append(r)
    }
    for k in order {
        let g = groups[k]!
        let lat = g.map(\.latencyMs).sorted()
        let parts = k.split(separator: "|").map(String.init)
        md.append("| \(parts[0]) | \(parts[1]) | \(parts[2]) | \(g.count) | \(g.filter(\.pass).count) | \(g.filter { !$0.pass }.count) | \(lat[lat.count / 2]) | \(lat.last ?? 0) |")
    }
    let fails = rows.filter { !$0.pass }
    md += ["", "## Failures (\(fails.count))", ""]
    md += fails.prefix(80).map { "- \($0.test) | \($0.app) | \($0.action) #\($0.run): \($0.outcome) - \($0.detail)" }
    if !notes.isEmpty { md += ["", "## Notes", ""] + notes.map { "- \($0)" } }
    let text = md.joined(separator: "\n") + "\n"
    try? text.write(to: outDir.appendingPathComponent("report.md"), atomically: true, encoding: .utf8)
    if let summary = ProcessInfo.processInfo.environment["GITHUB_STEP_SUMMARY"],
       let h = FileHandle(forWritingAtPath: summary) {
        h.seekToEndOfFile()
        h.write(Data(text.utf8))
        h.closeFile()
    }
}

guard trusted else {
    notes.append("This process is NOT trusted for Accessibility, so no app-control test could run. On a Mac, grant access in System Settings -> Privacy & Security -> Accessibility to the app that launches this tool (e.g. Terminal).")
    record("T9-permission", "-", "AXIsProcessTrusted", 1, "not_trusted", false)
    writeReport()
    exit(0)
}

// MARK: - Launch apps

guard let tePID = bringToFront(te.bundleID, open: ["-a", "TextEdit", docURL.path]) else {
    notes.append("TextEdit did not launch/activate")
    writeReport(); exit(0)
}
waitUntil(10) { focusedWindow(tePID) != nil }
guard let fiPID = bringToFront(fi.bundleID, open: [folderA.path]) else {
    notes.append("Finder did not activate")
    writeReport(); exit(0)
}
waitUntil(10) { windowTitle(fiPID) == "FolderA" }
let saPID = bringToFront(sa.bundleID, open: ["-a", "Safari", pageA.path])
if let saPID { waitUntil(15) { windowTitle(saPID).hasPrefix("PC-B") } }

// MARK: - T0 discovery: every catalog action resolves to exactly one menu item

for (adapter, pid) in [(te, tePID), (fi, fiPID)] + (saPID.map { [(sa, $0)] } ?? []) {
    dumpMenus(adapter.displayName, pid: pid)
    for def in adapter.actions {
        let start = Date()
        let r = CommandRunner.resolve(def, pid: pid)
        switch r {
        case .found: record("T0-discovery", adapter.displayName, def.label, 1, "resolved_exactly_one", true, ms(since: start))
        case .notFound: record("T0-discovery", adapter.displayName, def.label, 1, "not_found", false, ms(since: start))
        case .ambiguous(let n): record("T0-discovery", adapter.displayName, def.label, 1, "ambiguous_\(n)", false, ms(since: start))
        case .axError(let e): record("T0-discovery", adapter.displayName, def.label, 1, AX.describe(e), false, ms(since: start))
        }
    }
}
if saPID == nil { notes.append("Safari did not launch/activate; Safari tests skipped.") }

// MARK: - T1 TextEdit Save x20: type a token, press Save, file on disk must contain it

let save = te.action("textedit.save")!
for i in 1...20 {
    bringToFront(te.bundleID, open: ["-a", "TextEdit"])
    let token = " pc\(i)x"
    typeText(token, to: tePID)
    pump(0.3)
    let (o, t) = attempt(save, target: tePID)
    let ok = waitUntil(5) { ((try? String(contentsOf: docURL, encoding: .utf8)) ?? "").contains(token.trimmingCharacters(in: .whitespaces)) }
    record("T1-repeat", "TextEdit", "Save", i, o.label, o == .pressed && ok, t, ok ? "file updated on disk" : "file NOT updated")
}

// MARK: - T1 TextEdit Find x20: find field must appear; Escape closes it between runs

let find = te.action("textedit.find")!
func teHasFindFieldFor(_ pid: pid_t) -> Bool {
    guard let w = focusedWindow(pid) else { return false }
    return findDescendant(w) { subrole($0) == (kAXSearchFieldSubrole as String) } != nil
}
func teHasFindField() -> Bool { teHasFindFieldFor(tePID) }
for i in 1...20 {
    bringToFront(te.bundleID, open: ["-a", "TextEdit"])
    if teHasFindField() { pressKey(53, to: tePID); waitUntil(2) { !teHasFindField() } }
    let before = teHasFindField()
    let (o, t) = attempt(find, target: tePID)
    let after = waitUntil(3) { teHasFindField() }
    record("T1-repeat", "TextEdit", "Find", i, o.label, o == .pressed && !before && after, t,
           "find field before=\(before) after=\(after)")
}
pressKey(53, to: tePID)

// MARK: - T1 Finder New Folder x20: a new folder must appear on disk in FolderA

let newFolder = fi.action("finder.newfolder")!
for i in 1...20 {
    bringToFront(fi.bundleID, open: [folderA.path])
    let before = subfolderCount(folderA)
    let (o, t) = attempt(newFolder, target: fiPID)
    let ok = waitUntil(5) { subfolderCount(folderA) == before + 1 }
    record("T1-repeat", "Finder", "New Folder", i, o.label, o == .pressed && ok, t, "folders \(before)->\(subfolderCount(folderA))")
    pressKey(53, to: fiPID) // leave rename mode
}

// MARK: - T5 disabled state: a fresh Finder window has no history, so Back/Forward must be disabled and NOT sent

// MARK: - R2 helpers (is AXEnabled on a CLOSED menu up to date?)

func resolveItem(_ def: ActionDefinition, _ pid: pid_t) -> AXUIElement? {
    if case .found(let item) = CommandRunner.resolve(def, pid: pid) { return item }
    return nil
}
func rawEnabled(_ def: ActionDefinition, _ pid: pid_t) -> Bool? {
    guard let item = resolveItem(def, pid), case .value(let v) = AX.bool(item, kAXEnabledAttribute as String) else { return nil }
    return v
}
/// Opens the item's top-level menu through AX (visible on screen), reads AXEnabled after AppKit revalidates, closes it.
func enabledAfterMenuOpen(_ def: ActionDefinition, _ pid: pid_t) -> Bool? {
    guard let item = resolveItem(def, pid) else { return nil }
    var cur: AXUIElement? = item
    var barItem: AXUIElement?
    while let c = cur {
        if role(c) == (kAXMenuBarItemRole as String) { barItem = c; break }
        cur = AX.element(c, kAXParentAttribute as String)
    }
    guard let barItem else { return nil }
    _ = AXUIElementPerformAction(barItem, kAXPressAction as CFString)
    pump(0.5)
    var result: Bool?
    if let fresh = resolveItem(def, pid), case .value(let v) = AX.bool(fresh, kAXEnabledAttribute as String) { result = v }
    if let menu = AX.children(barItem).first { _ = AXUIElementPerformAction(menu, kAXCancelAction as CFString) }
    pressKey(53, to: pid)
    pump(0.3)
    return result
}
/// Experiment only: press regardless of AXEnabled.
func forcePress(_ def: ActionDefinition, _ pid: pid_t) -> String {
    guard let item = resolveItem(def, pid) else { return "not_found" }
    return "forced:" + AX.describe(AX.press(item))
}
func state(_ v: Bool?) -> String { v.map { $0 ? "enabled" : "disabled" } ?? "unknown" }

// Test-only helper: Finder's own "New Finder Window" (Cmd-N) gives a window with no navigation history.
let newFinderWindow = ActionDefinition(id: "test.newwindow", label: "New Finder Window", symbol: "", matchers: [.init(cmdChar: "N")])
bringToFront(fi.bundleID, open: [folderA.path])
let nw = CommandRunner.perform(newFinderWindow, targetPID: fiPID, frontmostPID: frontPID())
pump(1.5)
for def in [fi.action("finder.back")!, fi.action("finder.forward")!] {
    let (o, t) = attempt(def, target: fiPID)
    record("T5-disabled", "Finder", def.label, 1, o.label, o == .disabled, t, "new window (\(nw.label)), title=\(windowTitle(fiPID))")
}
// Real history: navigate this window with Finder's own Go > Applications (Shift-Cmd-A, test-only helper),
// then Back must be enabled and leave Applications, and Forward must return to it.
let goApplications = ActionDefinition(id: "test.goapps", label: "Go to Applications", symbol: "", matchers: [.init(cmdChar: "A", modifiers: [.shift])])
let titleBeforeNav = windowTitle(fiPID)
let navOutcome = CommandRunner.perform(goApplications, targetPID: fiPID, frontmostPID: frontPID())
waitUntil(3) { windowTitle(fiPID) != titleBeforeNav }
notes.append("Finder history setup: Go to Applications \(navOutcome.label), title \(titleBeforeNav) -> \(windowTitle(fiPID))")
let titleAfterNav = windowTitle(fiPID)
let fBack = fi.action("finder.back")!, fFwd = fi.action("finder.forward")!
// Truth here: Back IS available (we just navigated). Compare the raw closed-menu state, a menu-open refresh, and a forced press.
let rawB = rawEnabled(fBack, fiPID)
record("T7-R2-raw-state", "Finder", "Back", 1, "raw=\(state(rawB)) truth=enabled", rawB == true)
let refB = enabledAfterMenuOpen(fBack, fiPID)
record("T7-R2-menu-refresh", "Finder", "Back", 1, "refreshed=\(state(refB)) truth=enabled", refB == true)
let rawB2 = rawEnabled(fBack, fiPID)
record("T7-R2-raw-after-refresh", "Finder", "Back", 1, "raw=\(state(rawB2)) truth=enabled", rawB2 == true)
let fb = forcePress(fBack, fiPID)
let backChanged = waitUntil(3) { windowTitle(fiPID) != titleAfterNav }
record("T7-force-press-available", "Finder", "Back", 1, fb, backChanged, 0, "\(titleAfterNav) -> \(windowTitle(fiPID))")
let rawF = rawEnabled(fFwd, fiPID)
record("T7-R2-raw-state", "Finder", "Forward", 1, "raw=\(state(rawF)) truth=enabled", rawF == true)
let ff = forcePress(fFwd, fiPID)
let fwdChanged = waitUntil(3) { windowTitle(fiPID) == titleAfterNav }
record("T7-force-press-available", "Finder", "Forward", 1, ff, fwdChanged, 0, "-> \(windowTitle(fiPID))")
// Truly unavailable: now at the newest entry, Forward has nothing to do. A forced press must be harmless.
let titleNoop = windowTitle(fiPID)
let fnoop = forcePress(fFwd, fiPID)
pump(1)
record("T7-force-press-unavailable", "Finder", "Forward", 1, fnoop, windowTitle(fiPID) == titleNoop, 0, "title stays \(windowTitle(fiPID))")

// MARK: - T2 wrong-app guard x20: target TextEdit while Finder is in front -> must refuse, nothing changes anywhere

for i in 1...20 {
    bringToFront(fi.bundleID, open: [folderA.path])
    let folders = subfolderCount(folderA)
    let findBefore = teHasFindField()
    let (o, t) = attempt(find, target: tePID) // stale target on purpose
    pump(0.5)
    let unchanged = subfolderCount(folderA) == folders && teHasFindField() == findBefore
    record("T2-wrong-app-guard", "TextEdit->Finder", "Find", i, o.label, o == .refusedTargetChanged && unchanged, t,
           unchanged ? "no side effects" : "SIDE EFFECT DETECTED")
}

// MARK: - T2 app switching x20: alternate apps; each command must land only in the app in front

var wrongApp = 0
for i in 1...20 {
    let foldersBefore = subfolderCount(folderA)
    let docBefore = (try? String(contentsOf: docURL, encoding: .utf8)) ?? ""
    if i % 2 == 0 {
        bringToFront(te.bundleID, open: ["-a", "TextEdit"])
        let token = " sw\(i)y"
        typeText(token, to: tePID)
        pump(0.3)
        let (o, t) = attempt(save, target: frontPID() ?? -1)
        let saved = waitUntil(5) { ((try? String(contentsOf: docURL, encoding: .utf8)) ?? "").contains(token.trimmingCharacters(in: .whitespaces)) }
        let otherUntouched = subfolderCount(folderA) == foldersBefore
        if !otherUntouched { wrongApp += 1 }
        record("T2-app-switching", "TextEdit", "Save", i, o.label, o == .pressed && saved && otherUntouched, t,
               "saved=\(saved) finderUntouched=\(otherUntouched)")
    } else {
        bringToFront(fi.bundleID, open: [folderA.path])
        let (o, t) = attempt(newFolder, target: frontPID() ?? -1)
        let created = waitUntil(5) { subfolderCount(folderA) == foldersBefore + 1 }
        pressKey(53, to: fiPID)
        let otherUntouched = ((try? String(contentsOf: docURL, encoding: .utf8)) ?? "") == docBefore
        if !otherUntouched { wrongApp += 1 }
        record("T2-app-switching", "Finder", "New Folder", i, o.label, o == .pressed && created && otherUntouched, t,
               "created=\(created) textEditUntouched=\(otherUntouched)")
    }
}
notes.append("Wrong-app events during app switching: \(wrongApp)")

// MARK: - T6 stale references x5: old element after TextEdit relaunch must fail safely; fresh lookup must work

for i in 1...5 {
    bringToFront(te.bundleID, open: ["-a", "TextEdit", docURL.path])
    guard let pid = runningApp(te.bundleID)?.processIdentifier, case .found(let oldItem) = CommandRunner.resolve(find, pid: pid) else {
        record("T6-stale", "TextEdit", "Find", i, "could_not_resolve_before_quit", false)
        continue
    }
    runningApp(te.bundleID)?.terminate()
    waitUntil(10) { runningApp(te.bundleID) == nil }
    let staleErr = AX.press(oldItem)
    let newPID = bringToFront(te.bundleID, open: ["-a", "TextEdit", docURL.path]) ?? -1
    waitUntil(10) { focusedWindow(newPID) != nil }
    if teHasFindFieldFor(newPID) { pressKey(53, to: newPID) }
    let (o, t) = attempt(find, target: newPID)
    let fresh = waitUntil(3) { teHasFindFieldFor(newPID) }
    record("T6-stale", "TextEdit", "Find", i, "stale=\(AX.describe(staleErr)); fresh=\(o.label)",
           staleErr != .success && o == .pressed && fresh, t, "pid \(pid)->\(newPID)")
    pressKey(53, to: newPID)
}

// MARK: - Safari x20: Reload changes the timestamped title; Back -> PC-A; Forward -> PC-B; New Tab leaves PC- pages

if let saPID {
    let reload = sa.action("safari.reload")!, back = sa.action("safari.back")!, fwd = sa.action("safari.forward")!, newTab = sa.action("safari.newtab")!
    let closeTab = ActionDefinition(id: "test.closetab", label: "Close Tab", symbol: "", matchers: [.init(cmdChar: "W")])
    for i in 1...20 {
        bringToFront(sa.bundleID, open: ["-a", "Safari"])
        let before = windowTitle(saPID)
        let (o, t) = attempt(reload, target: saPID)
        let changed = waitUntil(5) { let now = windowTitle(saPID); return now.hasPrefix("PC-B") && now != before }
        record("T1-repeat", "Safari", "Reload", i, o.label, o == .pressed && changed, t, "\(before) -> \(windowTitle(saPID))")
    }
    // R2 experiment. Start state: PC-B with history [A, B], so Back is truly available.
    for i in 1...10 {
        bringToFront(sa.bundleID, open: ["-a", "Safari"])
        let rawBack = rawEnabled(back, saPID)
        record("T7-R2-raw-state", "Safari", "Back", i, "raw=\(state(rawBack)) truth=enabled", rawBack == true)
        let fb = forcePress(back, saPID)
        let wentBack = waitUntil(5) { windowTitle(saPID) == "PC-A" }
        record("T7-force-press-available", "Safari", "Back", i, fb, wentBack, 0, "title=\(windowTitle(saPID))")
        pump(0.3)
        // Now at A: Forward is truly available.
        let rawFwd = rawEnabled(fwd, saPID)
        record("T7-R2-raw-state", "Safari", "Forward", i, "raw=\(state(rawFwd)) truth=enabled", rawFwd == true)
        if i <= 3 {
            let refreshed = enabledAfterMenuOpen(fwd, saPID)
            record("T7-R2-menu-refresh", "Safari", "Forward", i, "refreshed=\(state(refreshed)) truth=enabled", refreshed == true)
        }
        let ff = forcePress(fwd, saPID)
        let wentFwd = waitUntil(5) { windowTitle(saPID).hasPrefix("PC-B") }
        record("T7-force-press-available", "Safari", "Forward", i, ff, wentFwd, 0, "title=\(windowTitle(saPID))")
        pump(0.3)
    }
    // Truly unavailable: at the newest entry Forward has nothing to do. A forced press must be harmless.
    let saNoop = windowTitle(saPID)
    let fnoopSa = forcePress(fwd, saPID)
    pump(1.5)
    record("T7-force-press-unavailable", "Safari", "Forward", 1, fnoopSa, windowTitle(saPID) == saNoop, 0, "title stays \(windowTitle(saPID))")
    for i in 1...20 {
        bringToFront(sa.bundleID, open: ["-a", "Safari"])
        let (o, t) = attempt(newTab, target: saPID)
        let opened = waitUntil(5) { !windowTitle(saPID).hasPrefix("PC-") }
        record("T1-repeat", "Safari", "New Tab", i, o.label, o == .pressed && opened, t, "title=\(windowTitle(saPID))")
        _ = CommandRunner.perform(closeTab, targetPID: saPID, frontmostPID: frontPID()) // test cleanup only
        waitUntil(5) { windowTitle(saPID).hasPrefix("PC-") }
    }
}

// MARK: - Done

let passed = rows.filter(\.pass).count
print("\nTOTAL \(rows.count) checks, \(passed) passed, \(rows.count - passed) failed")
writeReport()
exit(0)
