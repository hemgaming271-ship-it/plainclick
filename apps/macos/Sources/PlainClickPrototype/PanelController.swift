import AppKit
import Combine
import SwiftUI

/// A floating panel that never becomes key or main, so the target app stays active and keeps its own key window
/// (risk R4). Phase 0 is mouse-only for that reason; keyboard navigation is a Phase 1 design problem.
final class NonActivatingPanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

final class PanelController {
    private let panel: NonActivatingPanel
    private let engine: Engine
    private var refreshTimer: Timer?

    private var settingsObserver: AnyCancellable?

    init(engine: Engine, onOpenSettings: @escaping () -> Void) {
        self.engine = engine
        panel = NonActivatingPanel(
            contentRect: NSRect(x: 0, y: 0, width: 260, height: 200),
            styleMask: [.titled, .closable, .utilityWindow, .nonactivatingPanel],
            backing: .buffered,
            defer: true
        )
        panel.title = "PlainClick"
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.hidesOnDeactivate = false
        panel.becomesKeyOnlyIfNeeded = true
        panel.isReleasedWhenClosed = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

        let root = PanelView(
            model: engine.model,
            settings: engine.settings,
            licence: engine.licence,
            onPerform: { [weak engine] def in engine?.perform(def) },
            onEnable: { [weak engine] in engine?.requestPermission() },
            onOpenSettings: onOpenSettings
        )
        let host = NSHostingController(rootView: root)
        host.sizingOptions = [.preferredContentSize]
        panel.contentViewController = host

        if !panel.setFrameUsingName("PlainClickPanel") {
            if let screen = NSScreen.main {
                let f = screen.visibleFrame
                panel.setFrameTopLeftPoint(NSPoint(x: f.maxX - 300, y: f.maxY - 40))
            }
        }
        panel.setFrameAutosaveName("PlainClickPanel") // remembers position between launches
        panel.appearance = engine.settings.appearance.nsAppearance

        // Apply settings changes (appearance, enabled apps, pinned order) immediately.
        settingsObserver = engine.settings.objectWillChange
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in
                guard let self else { return }
                self.panel.appearance = self.engine.settings.appearance.nsAppearance
                if self.panel.isVisible { self.engine.retarget(NSWorkspace.shared.frontmostApplication) }
            }
    }

    var isVisible: Bool { panel.isVisible }
    var window: NSWindow { panel }

    func toggle() {
        if panel.isVisible { hide() } else { show() }
    }

    func show() {
        engine.retarget(NSWorkspace.shared.frontmostApplication)
        panel.orderFrontRegardless()
        // Re-check availability while visible (menu state changes as the user works).
        refreshTimer?.invalidate()
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { [weak self] _ in
            self?.engine.refresh()
        }
    }

    func hide() {
        refreshTimer?.invalidate()
        refreshTimer = nil
        panel.orderOut(nil)
    }
}
