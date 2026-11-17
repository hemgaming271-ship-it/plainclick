import AppKit
import ApplicationServices

enum Availability: Equatable {
    case ready, disabled, notFound, ambiguous(Int), noPermission, error(String)

    var isRunnable: Bool { self == .ready }

    var explanation: String {
        switch self {
        case .ready: return "Available"
        case .disabled: return "Not available right now"
        case .notFound: return "Command not found in this app version"
        case .ambiguous(let n): return "Matched \(n) commands — not used, to be safe"
        case .noPermission: return "App control is off"
        case .error(let e): return "Unavailable (\(e))"
        }
    }
}

struct ActionState: Identifiable {
    let def: ActionDefinition
    var availability: Availability
    var id: String { def.id }
}

final class PanelModel: ObservableObject {
    @Published var trusted = false
    @Published var paused = false
    @Published var targetName = "No app"
    @Published var targetPID: pid_t = 0
    @Published var supported = false
    @Published var disabledByUser = false
    @Published var actions: [ActionState] = []
    @Published var status = ""
}

/// Owns the target, resolves commands, and performs presses with the safety checks Phase 0 must prove.
final class Engine {
    let model = PanelModel()
    let settings: AppSettings
    let licence: LicenceManager
    private var targetApp: NSRunningApplication?
    /// Cached menu-item references, keyed "pid:actionID". Always re-validated before use (they go stale on relaunch).
    private var cache: [String: AXUIElement] = [:]
    private var observers: [NSObjectProtocol] = []
    private var permissionTimer: Timer?

    init(settings: AppSettings, licence: LicenceManager) {
        self.settings = settings
        self.licence = licence
        model.trusted = AXIsProcessTrusted()
        let nc = NSWorkspace.shared.notificationCenter
        observers.append(nc.addObserver(forName: NSWorkspace.didActivateApplicationNotification,
                                        object: nil, queue: .main) { [weak self] note in
            let app = note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication
            self?.retarget(app)
        })
        observers.append(nc.addObserver(forName: NSWorkspace.didTerminateApplicationNotification,
                                        object: nil, queue: .main) { [weak self] note in
            guard let self, let app = note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication
            else { return }
            self.cache = self.cache.filter { !$0.key.hasPrefix("\(app.processIdentifier):") }
            if app.processIdentifier == self.model.targetPID { self.retarget(nil) }
        })
        // Detect grant and revocation while running (risk R5). Polling is cheap; there is no public TCC change notification.
        permissionTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            guard let self else { return }
            let now = AXIsProcessTrusted()
            if now != self.model.trusted {
                self.model.trusted = now
                self.cache.removeAll()
                TrialLog.record(app: nil, actionID: "-", outcome: now ? "permission_granted" : "permission_revoked", latencyMs: 0)
                self.refresh()
            }
        }
        retarget(NSWorkspace.shared.frontmostApplication)
    }

    /// Asks macOS to show its own Accessibility prompt (which offers to open System Settings).
    /// Called only when the user clicks "Turn on app control" — never at launch.
    func requestPermission() {
        let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        model.trusted = AXIsProcessTrustedWithOptions([key: true] as CFDictionary)
    }

    func retarget(_ app: NSRunningApplication?) {
        // Ignore ourselves: activating the panel must never change the target.
        if let app, app.bundleIdentifier == Bundle.main.bundleIdentifier { return }
        targetApp = app
        model.targetPID = app?.processIdentifier ?? 0
        model.targetName = app?.localizedName ?? "No app"
        let adapter = ActionCatalog.adapter(for: app?.bundleIdentifier)
        model.supported = adapter != nil
        model.disabledByUser = adapter.map { !settings.isEnabled($0.bundleID) } ?? false
        let visible = (adapter != nil && !model.disabledByUser) ? settings.visibleActions(for: adapter!) : []
        model.actions = visible.map { ActionState(def: $0, availability: .notFound) }
        model.status = ""
        refresh()
    }

    func refresh() {
        guard let app = targetApp, !app.isTerminated else { return }
        for i in model.actions.indices {
            model.actions[i].availability = availability(of: model.actions[i].def, pid: app.processIdentifier).0
        }
    }

    private func availability(of def: ActionDefinition, pid: pid_t) -> (Availability, AXUIElement?) {
        guard model.trusted else { return (.noPermission, nil) }
        switch resolve(def, pid: pid) {
        case .found(let item):
            switch AX.bool(item, kAXEnabledAttribute as String) {
            case .value(true): return (.ready, item)
            case .value(false): return (.disabled, item)
            case .error(let e): return (.error(AX.describe(e)), nil)
            }
        case .notFound: return (.notFound, nil)
        case .ambiguous(let n): return (.ambiguous(n), nil)
        case .axError(let e): return (e == .apiDisabled ? .noPermission : .error(AX.describe(e)), nil)
        }
    }

    private func resolve(_ def: ActionDefinition, pid: pid_t) -> Resolution {
        let key = "\(pid):\(def.id)"
        if let cached = cache[key] {
            if case .error(let e) = AX.bool(cached, kAXEnabledAttribute as String), e == .invalidUIElement || e == .cannotComplete {
                cache[key] = nil // stale; fall through to a fresh lookup
            } else {
                return .found(cached)
            }
        }
        var last: Resolution = .notFound
        for matcher in def.matchers {
            last = MenuResolver.resolve(pid: pid, matcher: matcher)
            if case .found(let item) = last { cache[key] = item; return last }
            if case .ambiguous = last { return last } // never guess between several matches
        }
        return last
    }

    /// The only code path that sends a command to another app.
    func perform(_ def: ActionDefinition) {
        let start = Date()
        func ms() -> Int { Int(Date().timeIntervalSince(start) * 1000) }
        func finish(_ outcome: String, _ message: String, detail: String = "") {
            model.status = message
            TrialLog.record(app: targetApp, actionID: def.id, outcome: outcome, latencyMs: ms(), detail: detail)
        }

        guard !model.paused else { return finish("refused_paused", "PlainClick is paused.") }
        guard licence.isPanelAllowed else {
            return finish("refused_trial_ended", "Your 7-day trial has ended. Buy a licence to keep using the panel.")
        }
        guard !model.disabledByUser else { return finish("refused_app_disabled", "PlainClick is turned off for this app in Settings.") }
        guard AXIsProcessTrusted() else {
            model.trusted = false
            refresh()
            return finish("refused_no_permission", "App control is off. Nothing was sent.")
        }
        // Guard against sending to the wrong app: the app that is frontmost *now* must be the one the panel shows.
        let front = NSWorkspace.shared.frontmostApplication
        guard let app = targetApp, !app.isTerminated, let front,
              front.processIdentifier == app.processIdentifier else {
            retarget(front)
            return finish("refused_target_changed", "The front app changed. Nothing was sent — check the panel and try again.")
        }

        var (avail, item) = availability(of: def, pid: app.processIdentifier)
        guard avail.isRunnable, var target = item else {
            refresh()
            return finish("refused_\(String(describing: avail))", "\(def.label): \(avail.explanation). Nothing was sent.")
        }

        licence.noteTrialUse()
        var err = AX.press(target)
        if err == .invalidUIElement {
            // Stale reference (e.g. app relaunched or menu rebuilt): re-resolve once, re-check enabled, retry once.
            cache["\(app.processIdentifier):\(def.id)"] = nil
            (avail, item) = availability(of: def, pid: app.processIdentifier)
            if avail.isRunnable, let fresh = item {
                target = fresh
                err = AX.press(target)
            }
        }
        refresh()
        if err == .success {
            finish("pressed", "\(def.label) sent to \(app.localizedName ?? "app").")
        } else {
            finish("press_failed", "\(def.label) could not be sent (\(AX.describe(err))).", detail: AX.describe(err))
        }
    }

    // MARK: Developer discovery (Phase 0 only)

    /// Writes the frontmost app's menu items that have a key equivalent or identifier to a LOCAL file and reveals it.
    /// Titles are included so a developer can map commands; review before sharing (bookmark/window names can appear).
    func dumpMenuCommands() -> URL? {
        guard model.trusted, let app = targetApp else { return nil }
        let root = AX.app(pid: app.processIdentifier)
        guard let menuBar = AX.element(root, kAXMenuBarAttribute as String) else { return nil }
        var lines = ["# \(app.bundleIdentifier ?? "?") \(TrialLog.appVersion(app)) on \(ProcessInfo.processInfo.operatingSystemVersionString)",
                     "# path\tcmdChar\tmodifiers\tidentifier\tenabled\ttitle (LOCAL ONLY — review before sharing)"]
        func walk(_ el: AXUIElement, path: String, depth: Int) {
            guard depth < 6 else { return }
            for (i, child) in AX.children(el).enumerated() {
                let p = path.isEmpty ? "\(i)" : "\(path).\(i)"
                if AX.string(child, kAXRoleAttribute as String) == (kAXMenuItemRole as String) {
                    let ch = AX.string(child, kAXMenuItemCmdCharAttribute as String) ?? ""
                    let ident = AX.string(child, kAXIdentifierAttribute as String) ?? ""
                    if !ch.isEmpty || !ident.isEmpty {
                        let mods = AX.int(child, kAXMenuItemCmdModifiersAttribute as String) ?? 0
                        let enabled: String
                        switch AX.bool(child, kAXEnabledAttribute as String) {
                        case .value(let b): enabled = b ? "yes" : "no"
                        case .error(let e): enabled = AX.describe(e)
                        }
                        let title = AX.string(child, kAXTitleAttribute as String) ?? ""
                        lines.append("\(p)\t\(ch)\t\(mods)\t\(ident)\t\(enabled)\t\(title)")
                    }
                }
                walk(child, path: p, depth: depth + 1)
            }
        }
        walk(menuBar, path: "", depth: 0)
        let stamp = Int(Date().timeIntervalSince1970)
        let url = TrialLog.directory.appendingPathComponent("menu-dump-\(app.bundleIdentifier ?? "app")-\(stamp).tsv")
        try? lines.joined(separator: "\n").write(to: url, atomically: true, encoding: .utf8)
        return url
    }
}
