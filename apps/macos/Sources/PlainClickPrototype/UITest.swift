import AppKit
import ApplicationServices
import PlainClickCore
import SwiftUI

/// Automated UI test of the REAL PlainClick app (launched with `--ui-test <dir>`), for CI or a developer Mac.
/// It uses real system input (CGEvent mouse clicks and the real global hotkey) against the real panel and real
/// TextEdit/Safari/Calculator. It also writes screenshots: panel renders from the app's own SwiftUI views, plus
/// full-screen captures when the system allows them. Test-only code; it never runs in normal use.
@MainActor
final class UITestRunner {
    struct Row: Codable { let test: String; let pass: Bool; let detail: String }

    let app: AppDelegate
    let out: URL
    private var rows: [Row] = []
    private var shots: [String] = []
    private let doc: URL

    init(app: AppDelegate, out: URL) {
        self.app = app
        self.out = out
        try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
        let dir = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("pc-uitest-\(Int(Date().timeIntervalSince1970))")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        doc = dir.appendingPathComponent("Notes.txt")
        try? "Shopping list\n".write(to: doc, atomically: true, encoding: .utf8)
    }

    // MARK: Helpers

    /// Waits while still DISPATCHING app events (like NSApp.run does), so clicks on our own panel and the Carbon
    /// hotkey are actually delivered. A bare RunLoop.run here would swallow them (first CI run's false failures).
    private func wait(_ s: Double) {
        let end = Date().addingTimeInterval(s)
        repeat {
            if let event = NSApp.nextEvent(matching: .any, until: Date().addingTimeInterval(0.02), inMode: .default, dequeue: true) {
                NSApp.sendEvent(event)
            }
        } while Date() < end
    }

    @discardableResult
    private func waitUntil(_ t: Double, _ c: () -> Bool) -> Bool {
        let end = Date().addingTimeInterval(t)
        while Date() < end { if c() { return true }; wait(0.1) }
        return c()
    }

    /// AX queries into our OWN process must not run on the main thread (the main thread services them).
    private final class Box<T>: @unchecked Sendable {
        let lock = NSLock()
        var value: T?
        var done = false
    }

    private func offMain<T>(_ work: @escaping @Sendable () -> T) -> T? {
        let box = Box<T>()
        DispatchQueue.global().async {
            let r = work()
            box.lock.lock(); box.value = r; box.done = true; box.lock.unlock()
        }
        waitUntil(10) { box.lock.lock(); defer { box.lock.unlock() }; return box.done }
        box.lock.lock(); defer { box.lock.unlock() }
        return box.value
    }

    private func record(_ test: String, _ pass: Bool, _ detail: String) {
        rows.append(Row(test: test, pass: pass, detail: detail))
        print("\(pass ? "PASS" : "FAIL") \(test): \(detail)")
    }

    private func open(_ args: [String]) {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        p.arguments = args
        try? p.run()
        p.waitUntilExit()
    }

    private func frontBundle() -> String? { NSWorkspace.shared.frontmostApplication?.bundleIdentifier }

    private func pid(_ bundleID: String) -> pid_t? {
        NSRunningApplication.runningApplications(withBundleIdentifier: bundleID).first { !$0.isTerminated }?.processIdentifier
    }

    private func postHotKey() {
        let flags: CGEventFlags = [.maskControl, .maskAlternate]
        for down in [true, false] {
            let e = CGEvent(keyboardEventSource: nil, virtualKey: 35, keyDown: down) // 35 = P
            e?.flags = flags
            e?.post(tap: .cghidEventTap)
        }
    }

    private func click(_ p: CGPoint) {
        for type in [CGEventType.mouseMoved, .leftMouseDown, .leftMouseUp] {
            CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: p, mouseButton: .left)?.post(tap: .cghidEventTap)
            wait(0.08)
        }
    }

    /// Types into whatever app has keyboard focus (system-wide), like a person would.
    private func typeSystemWide(_ text: String) {
        for scalar in text.utf16 {
            var ch = scalar
            for down in [true, false] {
                let e = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: down)
                e?.keyboardSetUnicodeString(stringLength: 1, unicodeString: &ch)
                e?.post(tap: .cghidEventTap)
            }
            wait(0.03)
        }
    }

    private func pressEscape(to pid: pid_t) {
        for down in [true, false] { CGEvent(keyboardEventSource: nil, virtualKey: 53, keyDown: down)?.postToPid(pid) }
        wait(0.3)
    }

    nonisolated private static func frame(_ el: AXUIElement) -> CGRect? {
        var pv: CFTypeRef?
        var sv: CFTypeRef?
        guard AXUIElementCopyAttributeValue(el, kAXPositionAttribute as CFString, &pv) == .success,
              AXUIElementCopyAttributeValue(el, kAXSizeAttribute as CFString, &sv) == .success,
              let pv, let sv else { return nil }
        var p = CGPoint.zero
        var s = CGSize.zero
        AXValueGetValue(pv as! AXValue, .cgPoint, &p)
        AXValueGetValue(sv as! AXValue, .cgSize, &s)
        return CGRect(origin: p, size: s)
    }

    nonisolated private static func bfs(_ root: AXUIElement, limit: Int = 3000, _ match: (AXUIElement) -> Bool) -> AXUIElement? {
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

    /// Screen rect (top-left origin) of the panel button labelled `label`, found through Accessibility like VoiceOver would.
    private func panelButtonFrame(_ label: String) -> CGRect? {
        let me = getpid()
        return offMain {
            let root = AXUIElementCreateApplication(me)
            AXUIElementSetMessagingTimeout(root, 2)
            let button = Self.bfs(root) { el in
                AX.string(el, kAXRoleAttribute as String) == (kAXButtonRole as String) &&
                    (AX.string(el, kAXDescriptionAttribute as String) == label || AX.string(el, kAXTitleAttribute as String) == label)
            }
            return button.flatMap { Self.frame($0) }
        } ?? nil
    }

    private func textEditHasFindField(_ pid: pid_t) -> Bool {
        let app = AX.app(pid: pid)
        guard let w = AX.element(app, kAXFocusedWindowAttribute as String) else { return false }
        return Self.bfs(w) { AX.string($0, kAXSubroleAttribute as String) == (kAXSearchFieldSubrole as String) } != nil
    }

    private func textEditContent(_ pid: pid_t) -> String {
        let app = AX.app(pid: pid)
        guard let w = AX.element(app, kAXFocusedWindowAttribute as String),
              let area = Self.bfs(w, { AX.string($0, kAXRoleAttribute as String) == (kAXTextAreaRole as String) }) else { return "" }
        return AX.string(area, kAXValueAttribute as String) ?? ""
    }

    // MARK: Screenshots

    /// Renders the app's real PanelView (same model/state) to PNG. Needs no screen-recording permission.
    private func renderPanel(_ name: String, dark: Bool) {
        let view = PanelView(model: app.engine.model, settings: app.settings, licence: app.licence,
                             onPerform: { _ in }, onEnable: {}, onOpenSettings: {})
            .background(Color(nsColor: .windowBackgroundColor))
            .environment(\.colorScheme, dark ? .dark : .light)
        let renderer = ImageRenderer(content: view)
        renderer.scale = 2
        guard let image = renderer.nsImage, let tiff = image.tiffRepresentation,
              let rep = NSBitmapImageRep(data: tiff), let png = rep.representation(using: .png, properties: [:]) else {
            record("screenshot-render \(name)", false, "render failed")
            return
        }
        try? png.write(to: out.appendingPathComponent("\(name).png"))
        shots.append("\(name).png (render of the app's PanelView)")
    }

    /// Full-screen capture with the system tool. Works only if this environment allows screen capture.
    private func captureScreen(_ name: String) {
        let path = out.appendingPathComponent("\(name).png").path
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
        p.arguments = ["-x", path]
        try? p.run()
        p.waitUntilExit()
        let size = (try? FileManager.default.attributesOfItem(atPath: path)[.size] as? Int) ?? 0
        if size > 0 { shots.append("\(name).png (full-screen capture, \(size / 1024) KB)") }
        else { record("screenshot-screen \(name)", false, "screencapture produced no file (status \(p.terminationStatus))") }
    }

    // MARK: Run

    func run() {
        let te = "com.apple.TextEdit"
        record("environment", AXIsProcessTrusted(), "macOS \(ProcessInfo.processInfo.operatingSystemVersionString); AX trusted=\(AXIsProcessTrusted())")

        // Target app in front, panel hidden.
        open(["-a", "TextEdit", doc.path])
        waitUntil(15) { frontBundle() == te }
        wait(1)
        guard let tePID = pid(te) else { record("setup", false, "TextEdit did not start"); return finish() }
        if app.panel.isVisible { app.panel.hide() }

        // 1. Real global hotkey opens the panel.
        record("hotkey registered", app.hotKeyRegistered, "RegisterEventHotKey for Ctrl-Option-P")
        postHotKey()
        let shown = waitUntil(3) { app.panel.isVisible }
        record("hotkey opens panel", shown, shown ? "Ctrl-Option-P via HID event" : "panel did not appear; opening via menu path instead")
        if !shown { app.panel.show() }
        wait(0.8)

        // 2. Non-activating: the target app stays in front.
        record("panel does not steal focus", frontBundle() == te && !NSApp.isActive, "front=\(frontBundle() ?? "?"), PlainClick active=\(NSApp.isActive)")

        // 3. Correct target and only supported actions.
        let labels = app.engine.model.actions.map(\.def.label)
        record("panel shows target", app.engine.model.targetName == "TextEdit", "target=\(app.engine.model.targetName)")
        record("panel shows tested actions", labels == ["Save", "Find"], "buttons=\(labels)")
        captureScreen("01-screen-textedit-with-panel")
        renderPanel("panel-textedit-light", dark: false)
        renderPanel("panel-textedit-dark", dark: true)

        // 4. Real mouse click on the panel's Find button runs Find in TextEdit, and TextEdit stays in front.
        if textEditHasFindField(tePID) { pressEscape(to: tePID) }
        if let f = panelButtonFrame("Find") {
            click(CGPoint(x: f.midX, y: f.midY))
            let found = waitUntil(4) { textEditHasFindField(tePID) }
            record("click Find button", found, "find field appeared=\(found); status=\"\(app.engine.model.status)\"")
            let backInFront = waitUntil(2) { frontBundle() == te }
            record("target app in front after click", backInFront,
                   "front=\(frontBundle() ?? "?") PlainClick active=\(NSApp.isActive) panelKey=\(app.panel.window.isKeyWindow)")
            let log = (try? String(contentsOf: TrialLog.fileURL, encoding: .utf8))?.split(separator: "\n").suffix(3).joined(separator: " / ") ?? "no log"
            record("diagnostic: last engine log rows", true, log)
            captureScreen("02-screen-after-find")
            pressEscape(to: tePID)
        } else {
            record("click Find button", false, "Find button not found through Accessibility")
        }

        // 5. Typing still goes to TextEdit after clicking the panel (T4), then the panel's Save button saves it.
        let token = "milk eggs 42"
        typeSystemWide(" " + token)
        let typed = waitUntil(3) { textEditContent(tePID).contains(token) }
        record("typing continues in TextEdit after panel click", typed, typed ? "text arrived in TextEdit" : "text did not arrive")
        if let f = panelButtonFrame("Save") {
            click(CGPoint(x: f.midX, y: f.midY))
            let saved = waitUntil(5) { ((try? String(contentsOf: doc, encoding: .utf8)) ?? "").contains(token) }
            record("click Save button", saved, (saved ? "file on disk updated" : "file not updated") + "; status=\"\(app.engine.model.status)\"")
        } else {
            record("click Save button", false, "Save button not found through Accessibility")
        }

        // 6. Switching apps retargets the panel; unsupported apps get the honest message.
        open(["-a", "Calculator"])
        waitUntil(10) { frontBundle() == "com.apple.calculator" }
        wait(1)
        let unsupported = !app.engine.model.supported && app.engine.model.targetName.localizedCaseInsensitiveContains("Calc")
        record("unsupported app message", unsupported, "target=\(app.engine.model.targetName) supported=\(app.engine.model.supported)")
        captureScreen("03-screen-unsupported")
        renderPanel("panel-unsupported", dark: false)

        // 7. Safari shows only Reload and New Tab (Back/Forward excluded).
        open(["-a", "Safari"])
        waitUntil(15) { frontBundle() == "com.apple.Safari" }
        wait(1.5)
        let sLabels = app.engine.model.actions.map(\.def.label)
        record("Safari actions exclude Back/Forward", sLabels == ["Reload", "New Tab"], "buttons=\(sLabels)")
        renderPanel("panel-safari-dark", dark: true)
        app.settings.comfortable = false
        wait(0.5)
        renderPanel("panel-safari-compact", dark: false)
        app.settings.comfortable = true

        // 8. Trial state on a fresh install.
        var trialOK = false
        if case .trial = app.licence.state { trialOK = true }
        record("trial active on first use", trialOK, "state=\(app.licence.state)")

        // 9. Settings window.
        app.showSettings(.apps)
        wait(1.5)
        captureScreen("04-screen-settings")
        app.settingsWindow?.close()

        // 10. Escape route: hotkey toggles the panel closed.
        open(["-a", "TextEdit"])
        waitUntil(10) { frontBundle() == te }
        postHotKey()
        let hidden = waitUntil(3) { !app.panel.isVisible }
        record("hotkey hides panel", hidden, "visible=\(app.panel.isVisible)")

        finish()
    }

    private func finish() {
        let enc = JSONEncoder()
        enc.outputFormatting = [.prettyPrinted]
        try? enc.encode(rows).write(to: out.appendingPathComponent("ui-results.json"))
        let passed = rows.filter(\.pass).count
        var md = ["# PlainClick app UI test", "",
                  "- macOS: \(ProcessInfo.processInfo.operatingSystemVersionString)",
                  "- Result: \(passed)/\(rows.count) checks passed", "",
                  "| Check | Result | Detail |", "|---|---|---|"]
        md += rows.map { "| \($0.test) | \($0.pass ? "PASS" : "FAIL") | \($0.detail.replacingOccurrences(of: "|", with: "/")) |" }
        md += ["", "## Screenshots", ""] + shots.map { "- \($0)" }
        let text = md.joined(separator: "\n") + "\n"
        try? text.write(to: out.appendingPathComponent("ui-report.md"), atomically: true, encoding: .utf8)
        if let summary = ProcessInfo.processInfo.environment["GITHUB_STEP_SUMMARY"], let h = FileHandle(forWritingAtPath: summary) {
            h.seekToEndOfFile()
            h.write(Data(text.utf8))
            h.closeFile()
        }
        print("UI TEST DONE \(passed)/\(rows.count)")
        NSApp.terminate(nil)
    }
}
