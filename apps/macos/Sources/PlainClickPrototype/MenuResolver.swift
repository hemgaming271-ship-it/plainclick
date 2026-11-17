import ApplicationServices
import Foundation

enum Resolution {
    case found(AXUIElement)
    case notFound
    case ambiguous(count: Int)
    case axError(AXError)
}

/// Finds a menu item in a target app's menu bar by semantic signature (identifier or key equivalent), never by title.
/// The Apple menu (index 0) is skipped: it belongs to the system, not the target app.
enum MenuResolver {
    private static let maxDepth = 6
    private static let maxItems = 3000

    static func resolve(pid: pid_t, matcher: MenuMatcher) -> Resolution {
        let app = AX.app(pid: pid)
        let (err, value) = AX.copy(app, kAXMenuBarAttribute as String)
        guard err == .success, let v = value, CFGetTypeID(v) == AXUIElementGetTypeID() else {
            return .axError(err == .success ? .failure : err)
        }
        let menuBar = v as! AXUIElement
        var matches: [AXUIElement] = []
        var visited = 0
        for (index, barItem) in AX.children(menuBar).enumerated() where index > 0 {
            walk(barItem, depth: 0, matcher: matcher, matches: &matches, visited: &visited)
            if visited >= maxItems { break }
        }
        switch matches.count {
        case 0: return .notFound
        case 1: return .found(matches[0])
        default: return .ambiguous(count: matches.count)
        }
    }

    private static func walk(_ el: AXUIElement, depth: Int, matcher: MenuMatcher,
                             matches: inout [AXUIElement], visited: inout Int) {
        guard depth <= maxDepth, visited < maxItems else { return }
        for child in AX.children(el) {
            visited += 1
            let role = AX.string(child, kAXRoleAttribute as String)
            if role == (kAXMenuItemRole as String), itemMatches(child, matcher) {
                matches.append(child)
            }
            // Menu bar items and submenu items contain an AXMenu child; recurse into it.
            walk(child, depth: depth + 1, matcher: matcher, matches: &matches, visited: &visited)
            if visited >= maxItems { return }
        }
    }

    static func itemMatches(_ item: AXUIElement, _ m: MenuMatcher) -> Bool {
        if let wanted = m.identifier {
            return AX.string(item, kAXIdentifierAttribute as String) == wanted
        }
        guard let wantedChar = m.cmdChar,
              let char = AX.string(item, kAXMenuItemCmdCharAttribute as String), !char.isEmpty else { return false }
        let mods = AX.Modifiers(rawValue: AX.int(item, kAXMenuItemCmdModifiersAttribute as String) ?? 0)
        return char.caseInsensitiveCompare(wantedChar) == .orderedSame && mods == m.modifiers
    }
}
