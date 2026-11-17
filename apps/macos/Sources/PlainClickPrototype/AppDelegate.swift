import AppKit
import ApplicationServices
import Carbon
import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var settings: AppSettings!
    private var licence: LicenceManager!
    private var engine: Engine!
    private var panel: PanelController!
    private var statusItem: NSStatusItem!
    private var hotKey: HotKey?
    private var settingsWindow: NSWindow?
    private let pauseItem = NSMenuItem(title: "Pause PlainClick", action: #selector(togglePause), keyEquivalent: "")

    func applicationDidFinishLaunching(_ notification: Notification) {
        settings = AppSettings()
        licence = LicenceManager() // reads the Keychain only; never blocks on the network
        engine = Engine(settings: settings, licence: licence)
        panel = PanelController(engine: engine, onOpenSettings: { [weak self] in self?.showSettings(.licence) })

        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "rectangle.grid.1x2", accessibilityDescription: "PlainClick")
            button.setAccessibilityLabel("PlainClick")
        }

        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Open Panel  (⌃⌥Space)", action: #selector(togglePanel), keyEquivalent: ""))
        menu.addItem(NSMenuItem(title: "Settings…", action: #selector(openSettings), keyEquivalent: ","))
        menu.addItem(NSMenuItem(title: "Manage Licence…", action: #selector(openLicence), keyEquivalent: ""))
        menu.addItem(NSMenuItem(title: "Appearance Guide (free)…", action: #selector(openGuide), keyEquivalent: ""))
        menu.addItem(pauseItem)
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Turn On App Control…", action: #selector(enableControl), keyEquivalent: ""))
        // Developer items stay visible during beta testing; remove before the public 1.0 release.
        menu.addItem(NSMenuItem(title: "Developer: Dump Menu Commands of Front App", action: #selector(dumpMenus), keyEquivalent: ""))
        menu.addItem(NSMenuItem(title: "Developer: Open Test Log Folder", action: #selector(openLogs), keyEquivalent: ""))
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Quit PlainClick", action: #selector(quit), keyEquivalent: "q"))
        for item in menu.items { item.target = self }
        statusItem.menu = menu

        hotKey = HotKey(keyCode: UInt32(kVK_Space), modifiers: UInt32(controlKey | optionKey)) { [weak self] in
            self?.panel.toggle()
        }
        if hotKey == nil {
            NSLog("PlainClick: could not register ⌃⌥Space (already in use?). Use the menu bar item instead.")
        }
        TrialLog.record(app: nil, actionID: "-", outcome: "launched", latencyMs: 0,
                        detail: AXIsProcessTrusted() ? "trusted" : "not_trusted")
    }

    private func showSettings(_ tab: SettingsView.Tab) {
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

    @objc private func togglePanel() { panel.toggle() }
    @objc private func openSettings() { showSettings(.apps) }
    @objc private func openLicence() { showSettings(.licence) }
    @objc private func openGuide() { showSettings(.guide) }
    @objc private func enableControl() { engine.requestPermission() }

    @objc private func togglePause() {
        engine.model.paused.toggle()
        pauseItem.state = engine.model.paused ? .on : .off
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
