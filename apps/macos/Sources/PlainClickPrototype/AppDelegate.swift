import AppKit
import ApplicationServices
import Carbon
import Combine
import ServiceManagement
import Sparkle
import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    // Internal (not private) so the --ui-test runner in UITest.swift can drive the real objects.
    var settings: AppSettings!
    var licence: LicenceManager!
    var engine: Engine!
    var panel: PanelController!
    private var statusItem: NSStatusItem!
    private var hotKey: HotKey?
    var hotKeyRegistered: Bool { hotKey != nil }
    var settingsWindow: NSWindow?
    private var uiTest: UITestRunner?
    private let pauseItem = NSMenuItem(title: "Pause PlainClick", action: #selector(togglePause), keyEquivalent: "")
    private let panelItem = NSMenuItem(title: "Show Panel", action: #selector(togglePanel), keyEquivalent: "")
    private let enableItem = NSMenuItem(title: "Turn On App Control…", action: #selector(enableControl), keyEquivalent: "")
    private let loginItem = NSMenuItem(title: "Launch at Login", action: #selector(toggleLaunchAtLogin), keyEquivalent: "")
    private var developerItems: [NSMenuItem] = []
    private var quickKeys: [HotKey] = []
    private var settingsObserver: AnyCancellable?
    /// nil unless the build has an update feed and signing key (release builds; see scripts/build-app.sh).
    private var updater: SPUStandardUpdaterController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        settings = AppSettings()
        licence = LicenceManager() // reads local licence data only; never blocks on the network
        engine = Engine(settings: settings, licence: licence)
        panel = PanelController(engine: engine,
                                onOpenSettings: { [weak self] in self?.showSettings(.licence) },
                                onOpenPreferences: { [weak self] in self?.showSettings(.general) })

        let info = Bundle.main.infoDictionary
        if let feed = info?["SUFeedURL"] as? String, !feed.isEmpty,
           let key = info?["SUPublicEDKey"] as? String, !key.isEmpty,
           !ProcessInfo.processInfo.arguments.contains(where: { $0 == "--ui-test" || $0 == "--demo" }) {
            updater = SPUStandardUpdaterController(startingUpdater: true, updaterDelegate: nil, userDriverDelegate: nil)
        }

        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "rectangle.grid.1x2", accessibilityDescription: "PlainClick")
            button.setAccessibilityLabel("PlainClick")
        }

        let menu = NSMenu()
        menu.delegate = self
        panelItem.keyEquivalentModifierMask = [.control, .option]
        menu.addItem(panelItem)
        menu.addItem(NSMenuItem(title: "Settings…", action: #selector(openSettings), keyEquivalent: ","))
        menu.addItem(NSMenuItem(title: "Manage Licence…", action: #selector(openLicence), keyEquivalent: ""))
        menu.addItem(NSMenuItem(title: "Appearance Guide (free)…", action: #selector(openGuide), keyEquivalent: ""))
        if let updater {
            let item = NSMenuItem(title: "Check for Updates…", action: #selector(SPUStandardUpdaterController.checkForUpdates(_:)), keyEquivalent: "")
            item.target = updater
            menu.addItem(item)
        }
        menu.addItem(.separator())
        menu.addItem(pauseItem)
        menu.addItem(loginItem)
        menu.addItem(enableItem)
        // Developer tools appear only while Option is held when the menu opens.
        let devSeparator = NSMenuItem.separator()
        developerItems = [
            devSeparator,
            NSMenuItem(title: "Developer: Dump Menu Commands of Front App", action: #selector(dumpMenus), keyEquivalent: ""),
            NSMenuItem(title: "Developer: Open Test Log Folder", action: #selector(openLogs), keyEquivalent: ""),
        ]
        developerItems.forEach(menu.addItem)
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Quit PlainClick", action: #selector(quit), keyEquivalent: "q"))
        for item in menu.items { item.target = self }
        statusItem.menu = menu

        hotKey = HotKey(keyCode: UInt32(kVK_ANSI_P), modifiers: UInt32(controlKey | optionKey)) { [weak self] in
            self?.panel.toggle()
        }
        if hotKey == nil {
            NSLog("PlainClick: could not register ⌃⌥P (already in use?). Use the menu bar item instead.")
        }
        updateQuickKeys()
        settingsObserver = settings.$quickKeys.removeDuplicates().dropFirst()
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in self?.updateQuickKeys() }
        TrialLog.record(app: nil, actionID: "-", outcome: "launched", latencyMs: 0,
                        detail: AXIsProcessTrusted() ? "trusted" : "not_trusted")

        // Automated UI test mode (CI / developer only): PlainClickPrototype --ui-test <output-dir>
        // Demo mode for recording launch-video footage: PlainClickPrototype --demo <output-dir>
        if let i = CommandLine.arguments.firstIndex(of: "--demo") {
            let dir = CommandLine.arguments.indices.contains(i + 1) ? CommandLine.arguments[i + 1] : "demo-out"
            Task { @MainActor [weak self] in
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard let self else { return }
                let runner = UITestRunner(app: self, out: URL(fileURLWithPath: dir, isDirectory: true))
                self.uiTest = runner
                runner.runDemo()
            }
        }
        if let i = CommandLine.arguments.firstIndex(of: "--ui-test") {
            let dir = CommandLine.arguments.indices.contains(i + 1) ? CommandLine.arguments[i + 1] : "ui-test-out"
            Task { @MainActor [weak self] in
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard let self else { return }
                let runner = UITestRunner(app: self, out: URL(fileURLWithPath: dir, isDirectory: true))
                self.uiTest = runner
                runner.run()
            }
        }
    }

    func showSettings(_ tab: SettingsView.Tab) {
        let view = SettingsView(settings: settings, licence: licence, initialTab: tab)
        if settingsWindow == nil {
            let w = NSWindow(contentViewController: NSHostingController(rootView: view))
            w.title = "PlainClick Settings"
            w.styleMask = [.titled, .closable]
            w.isReleasedWhenClosed = false
            w.center()
            settingsWindow = w
        } else {
            settingsWindow?.contentViewController = NSHostingController(rootView: view)
        }
        NSApp.activate(ignoringOtherApps: true)
        settingsWindow?.makeKeyAndOrderFront(nil)
    }

    /// ⌃⌥1 … ⌃⌥9 press the panel's actions. Keys already taken by another app are skipped silently.
    private func updateQuickKeys() {
        quickKeys.removeAll()
        guard settings.quickKeys else { return }
        let codes = [kVK_ANSI_1, kVK_ANSI_2, kVK_ANSI_3, kVK_ANSI_4, kVK_ANSI_5, kVK_ANSI_6, kVK_ANSI_7, kVK_ANSI_8, kVK_ANSI_9]
        for (i, code) in codes.enumerated() {
            if let key = HotKey(keyCode: UInt32(code), modifiers: UInt32(controlKey | optionKey), callback: { [weak self] in
                self?.engine.performQuickAction(i)
            }) {
                quickKeys.append(key)
            }
        }
    }

    func menuNeedsUpdate(_ menu: NSMenu) {
        panelItem.title = panel.isVisible ? "Hide Panel  (⌃⌥P)" : "Show Panel  (⌃⌥P)"
        pauseItem.title = engine.model.paused ? "Resume PlainClick" : "Pause PlainClick"
        pauseItem.state = .off
        enableItem.isHidden = engine.model.trusted
        loginItem.state = SMAppService.mainApp.status == .enabled ? .on : .off
        let showDeveloper = NSEvent.modifierFlags.contains(.option)
        developerItems.forEach { $0.isHidden = !showDeveloper }
    }

    @objc private func toggleLaunchAtLogin() { LaunchAtLogin.toggle() }

    @objc private func togglePanel() { panel.toggle() }
    @objc private func openSettings() { showSettings(.apps) }
    @objc private func openLicence() { showSettings(.licence) }
    @objc private func openGuide() { showSettings(.guide) }
    @objc private func enableControl() { engine.requestPermission() }

    @objc private func togglePause() {
        engine.model.paused.toggle()
    }

    @objc private func dumpMenus() {
        if let url = engine.dumpMenuCommands() {
            NSWorkspace.shared.activateFileViewerSelecting([url])
        } else {
            NSSound.beep()
        }
    }

    @objc private func openLogs() { NSWorkspace.shared.open(TrialLog.directory) }
    @objc private func quit() { NSApp.terminate(nil) }
}

/// Wraps `SMAppService.mainApp` (macOS 13+). Only works from the installed .app bundle, not `swift run`.
enum LaunchAtLogin {
    /// Posted after every change attempt so open views (Settings → General) can re-read the real status.
    static let didChange = Notification.Name("PlainClickLaunchAtLoginDidChange")

    static var isEnabled: Bool { SMAppService.mainApp.status == .enabled }

    @discardableResult
    static func set(_ on: Bool) -> Bool {
        defer { NotificationCenter.default.post(name: didChange, object: nil) }
        do {
            if on { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
            return true
        } catch {
            NSLog("PlainClick: launch at login change failed: \(error.localizedDescription)")
            return false
        }
    }

    static func toggle() { set(!isEnabled) }
}
