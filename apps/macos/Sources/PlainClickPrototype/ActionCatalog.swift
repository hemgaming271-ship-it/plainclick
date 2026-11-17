import Foundation

/// How we recognise a menu command without relying on its (localised) title.
struct MenuMatcher: Hashable {
    /// Preferred: the menu item's AXIdentifier, when the app provides one. Fill in from the discovery dump.
    var identifier: String?
    /// Fallback: keyboard-equivalent character as reported by AXMenuItemCmdChar (case-insensitive compare).
    var cmdChar: String?
    var modifiers: AX.Modifiers = .commandOnly
}

struct ActionDefinition: Identifiable, Hashable {
    let id: String              // stable, e.g. "safari.back"
    let label: String           // our own plain label (English for the prototype)
    let symbol: String          // SF Symbol name, optional decoration only
    let matchers: [MenuMatcher] // tried in order; first one that resolves to exactly one item wins
}

struct AppAdapter {
    let bundleID: String
    let displayName: String
    let actions: [ActionDefinition]
}

/// PROTOTYPE CANDIDATES — NOT VERIFIED COMPATIBILITY.
/// Shortcut signatures are the stock US-English defaults as commonly documented; every one must be confirmed with
/// the discovery dump ("Dump menu commands of frontmost app…") on the macOS build and app version under test.
enum ActionCatalog {
    static let adapters: [AppAdapter] = [
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

    static func adapter(for bundleID: String?) -> AppAdapter? {
        guard let bundleID else { return nil }
        return adapters.first { $0.bundleID == bundleID }
    }
}
