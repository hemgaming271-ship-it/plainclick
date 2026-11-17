import ApplicationServices
import Foundation

public enum Resolution {
    case found(AXUIElement)
    case notFound
    case ambiguous(count: Int)
    case axError(AXError)
}

/// Finds a menu item in a target app's menu bar by semantic signature (identifier or key equivalent), never by title.
/// The Apple menu (index 0) is skipped: it belongs to the system, not the target app.
public enum MenuResolver {
    private static let maxDepth = 6
    private static let maxItems = 3000

    public static func resolve(pid: pid_t, matcher: MenuMatcher) -> Resolution {
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

    public static func itemMatches(_ item: AXUIElement, _ m: MenuMatcher) -> Bool {
        if let wanted = m.identifier {
            return AX.string(item, kAXIdentifierAttribute as String) == wanted
        }
        guard let wantedChar = m.cmdChar,
              let char = AX.string(item, kAXMenuItemCmdCharAttribute as String), !char.isEmpty else { return false }
        let mods = AX.Modifiers(rawValue: AX.int(item, kAXMenuItemCmdModifiersAttribute as String) ?? 0)
        return char.caseInsensitiveCompare(wantedChar) == .orderedSame && mods == m.modifiers
    }
}

/// Outcome of one guarded attempt to run a command in another app.
public enum PressOutcome: Equatable {
    case pressed
    case refusedTargetChanged
    case disabled
    case notFound
    case ambiguous(Int)
    case failed(String)

    public var label: String {
        switch self {
        case .pressed: return "pressed"
        case .refusedTargetChanged: return "refused_target_changed"
        case .disabled: return "disabled_not_sent"
        case .notFound: return "not_found"
        case .ambiguous(let n): return "ambiguous_\(n)"
        case .failed(let e): return "failed: \(e)"
        }
    }
}

/// The single, shared safety path for sending a command: right target in front → exactly one match → enabled → press.
public enum CommandRunner {
    public static func resolve(_ def: ActionDefinition, pid: pid_t) -> Resolution {
        var last: Resolution = .notFound
        for matcher in def.matchers {
            last = MenuResolver.resolve(pid: pid, matcher: matcher)
            switch last {
            case .found, .ambiguous: return last
            default: continue
            }
        }
        return last
    }

    public static func perform(_ def: ActionDefinition, targetPID: pid_t, frontmostPID: pid_t?) -> PressOutcome {
        guard let frontmostPID, frontmostPID == targetPID else { return .refusedTargetChanged }
        switch resolve(def, pid: targetPID) {
        case .notFound: return .notFound
        case .ambiguous(let n): return .ambiguous(n)
        case .axError(let e): return .failed(AX.describe(e))
        case .found(let item):
            switch AX.bool(item, kAXEnabledAttribute as String) {
            case .error(let e): return .failed(AX.describe(e))
            case .value(false): return .disabled
            case .value(true):
                let err = AX.press(item)
                return err == .success ? .pressed : .failed(AX.describe(err))
            }
        }
    }
}
