import AppKit
import Foundation
import PlainClickCore
import SwiftUI

/// Local preferences (UserDefaults). Nothing here leaves the Mac.
final class AppSettings: ObservableObject {
    enum Appearance: String, CaseIterable, Identifiable {
        case system, light, dark
        var id: String { rawValue }
        var label: String { rawValue.capitalized }
        var nsAppearance: NSAppearance? {
            switch self {
            case .system: return nil
            case .light: return NSAppearance(named: .aqua)
            case .dark: return NSAppearance(named: .darkAqua)
            }
        }
    }

    private let d = UserDefaults.standard

    @Published var appearance: Appearance { didSet { d.set(appearance.rawValue, forKey: "appearance") } }
    @Published var comfortable: Bool { didSet { d.set(comfortable, forKey: "comfortable") } }
    @Published var showIcons: Bool { didSet { d.set(showIcons, forKey: "showIcons") } }
    /// ⌃⌥1 … ⌃⌥9 press the panel's first nine actions.
    @Published var quickKeys: Bool { didSet { d.set(quickKeys, forKey: "quickKeys") } }
    /// Bundle IDs the user has switched off.
    @Published var disabledApps: Set<String> { didSet { d.set(Array(disabledApps), forKey: "disabledApps") } }
    /// Per-app ordered list of pinned action IDs. Missing entry = all tested actions in catalog order.
    @Published var pinned: [String: [String]] { didSet { d.set(pinned, forKey: "pinned") } }

    init() {
        appearance = Appearance(rawValue: d.string(forKey: "appearance") ?? "") ?? .system
        comfortable = d.object(forKey: "comfortable") as? Bool ?? true
        showIcons = d.object(forKey: "showIcons") as? Bool ?? true
        quickKeys = d.object(forKey: "quickKeys") as? Bool ?? true
        disabledApps = Set(d.stringArray(forKey: "disabledApps") ?? [])
        pinned = d.dictionary(forKey: "pinned") as? [String: [String]] ?? [:]
    }

    func isEnabled(_ bundleID: String) -> Bool { !disabledApps.contains(bundleID) }

    func setEnabled(_ bundleID: String, _ on: Bool) {
        if on { disabledApps.remove(bundleID) } else { disabledApps.insert(bundleID) }
    }

    /// The actions to show, in the user's order. Only IDs that still exist in the catalog are returned.
    func visibleActions(for adapter: AppAdapter) -> [ActionDefinition] {
        guard let order = pinned[adapter.bundleID] else { return adapter.supportedActions }
        let byID = Dictionary(uniqueKeysWithValues: adapter.supportedActions.map { ($0.id, $0) })
        return order.compactMap { byID[$0] }
    }

    func isPinned(_ action: ActionDefinition, in adapter: AppAdapter) -> Bool {
        visibleActions(for: adapter).contains(action)
    }

    func togglePin(_ action: ActionDefinition, in adapter: AppAdapter) {
        var order = visibleActions(for: adapter).map(\.id)
        if let i = order.firstIndex(of: action.id) { order.remove(at: i) } else { order.append(action.id) }
        pinned[adapter.bundleID] = order
    }

    func reorder(in adapter: AppAdapter, from source: IndexSet, to destination: Int) {
        var order = visibleActions(for: adapter).map(\.id)
        order.move(fromOffsets: source, toOffset: destination)
        pinned[adapter.bundleID] = order
    }

    func resetOrder(for adapter: AppAdapter) { pinned[adapter.bundleID] = nil }

    func move(_ action: ActionDefinition, in adapter: AppAdapter, by delta: Int) {
        var order = visibleActions(for: adapter).map(\.id)
        guard let i = order.firstIndex(of: action.id) else { return }
        let j = i + delta
        guard order.indices.contains(j) else { return }
        order.swapAt(i, j)
        pinned[adapter.bundleID] = order
    }
}
