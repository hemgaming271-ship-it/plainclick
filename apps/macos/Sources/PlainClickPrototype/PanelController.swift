import AppKit
import Combine
import SwiftUI

/// A floating panel that never becomes key or main, so keyboard focus stays in the target app (risk R4).
/// Mouse only for now; keyboard navigation inside the panel is a separate design problem.
final class NonActivatingPanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

/// Lets the very first click on the (never-key) panel trigger the button instead of being swallowed.
/// Found by the CI UI test on macOS 15.8.2 / 26.7.2: without this, clicks did nothing.
final class FirstMouseHostingView<Content: View>: NSHostingView<Content> {
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
}

final class PanelController {
    private let panel: NonActivatingPanel
    private let host: FirstMouseHostingView<PanelView>
    private let engine: Engine
    private var refreshTimer: Timer?
    private var observers: [AnyCancellable] = []

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
        host = FirstMouseHostingView(rootView: root)
        panel.contentView = host
        fitToContent()

        if !panel.setFrameUsingName("PlainClickPanel") {
            if let screen = NSScreen.main {
                let f = screen.visibleFrame
                panel.setFrameTopLeftPoint(NSPoint(x: f.maxX - 300, y: f.maxY - 40))
            }
        }
        panel.setFrameAutosaveName("PlainClickPanel") // remembers position between launches
        panel.appearance = engine.settings.appearance.nsAppearance

        // Apply settings changes (appearance, enabled apps, pinned order) immediately.
        observers.append(engine.settings.objectWillChange
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in
                guard let self else { return }
                self.panel.appearance = self.engine.settings.appearance.nsAppearance
                if self.panel.isVisible { self.engine.retarget(NSWorkspace.shared.frontmostApplication) }
                self.fitToContent()
            })
        // Content changes (different target, status text) can change the height.
        observers.append(engine.model.objectWillChange
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in self?.fitToContent() })
    }

    var isVisible: Bool { panel.isVisible }
    var window: NSWindow { panel }

    /// Resizes the panel to its SwiftUI content while keeping the top edge where the user put it.
    private func fitToContent() {
        let content = host.fittingSize
        guard content.width > 0, content.height > 0 else { return }
        let target = panel.frameRect(forContentRect: NSRect(origin: .zero, size: content))
        var frame = panel.frame
        frame.origin.y += frame.height - target.height
        frame.size = target.size
        panel.setFrame(frame, display: true)
    }

    func toggle() {
        if panel.isVisible { hide() } else { show() }
    }

    func show() {
        engine.retarget(NSWorkspace.shared.frontmostApplication)
        fitToContent()
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
