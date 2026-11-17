import Foundation

/// How we recognise a menu command without relying on its (localised) title.
public struct MenuMatcher: Hashable {
    /// Preferred: the menu item's AXIdentifier, when the app provides one. Fill in from the discovery dump.
    public var identifier: String?
    /// Fallback: keyboard-equivalent character as reported by AXMenuItemCmdChar (case-insensitive compare).
    public var cmdChar: String?
    public var modifiers: AX.Modifiers

    public init(identifier: String? = nil, cmdChar: String? = nil, modifiers: AX.Modifiers = .commandOnly) {
        self.identifier = identifier
        self.cmdChar = cmdChar
        self.modifiers = modifiers
    }
}

public struct ActionDefinition: Identifiable, Hashable {
    public let id: String              // stable, e.g. "safari.back"
    public let label: String           // our own plain label (English for now)
    public let symbol: String          // SF Symbol name, optional decoration only
    public let matchers: [MenuMatcher] // tried in order; first one that resolves to exactly one item wins

    public init(id: String, label: String, symbol: String, matchers: [MenuMatcher]) {
        self.id = id
        self.label = label
        self.symbol = symbol
        self.matchers = matchers
    }
}

public struct AppAdapter {
    public let bundleID: String
    public let displayName: String
    public let actions: [ActionDefinition]

    public init(bundleID: String, displayName: String, actions: [ActionDefinition]) {
        self.bundleID = bundleID
        self.displayName = displayName
        self.actions = actions
    }

    public func action(_ id: String) -> ActionDefinition? { actions.first { $0.id == id } }
}

/// CANDIDATES — compatibility is claimed only for rows verified in docs/compatibility.md.
/// Shortcut signatures are the stock defaults; confirm them with the discovery dump on each macOS/app version.
public enum ActionCatalog {
    public static let adapters: [AppAdapter] = [
        AppAdapter(bundleID: "com.apple.Safari", displayName: "Safari", actions: [
            .init(id: "safari.back",    label: "Back",    symbol: "chevron.backward", matchers: [.init(cmdChar: "[")]),
            .init(id: "safari.forward", label: "Forward", symbol: "chevron.forward",  matchers: [.init(cmdChar: "]")]),
            .init(id: "safari.reload",  label: "Reload",  symbol: "arrow.clockwise",  matchers: [.init(cmdChar: "R")]),
            .init(id: "safari.newtab",  label: "New Tab", symbol: "plus.square",      matchers: [.init(cmdChar: "T")]),
        ]),
        AppAdapter(bundleID: "com.apple.finder", displayName: "Finder", actions: [
            .init(id: "finder.back",      label: "Back",       symbol: "chevron.backward", matchers: [.init(cmdChar: "[")]),
            .init(id: "finder.forward",   label: "Forward",    symbol: "chevron.forward",  matchers: [.init(cmdChar: "]")]),
            .init(id: "finder.newfolder", label: "New Folder", symbol: "folder.badge.plus",
                  matchers: [.init(cmdChar: "N", modifiers: [.shift])]),
        ]),
        AppAdapter(bundleID: "com.apple.TextEdit", displayName: "TextEdit", actions: [
            .init(id: "textedit.save", label: "Save", symbol: "square.and.arrow.down", matchers: [.init(cmdChar: "S")]),
            .init(id: "textedit.find", label: "Find", symbol: "magnifyingglass",       matchers: [.init(cmdChar: "F")]),
        ]),
    ]

    public static func adapter(for bundleID: String?) -> AppAdapter? {
        guard let bundleID else { return nil }
        return adapters.first { $0.bundleID == bundleID }
    }
}
