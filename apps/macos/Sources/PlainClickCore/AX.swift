import ApplicationServices
import Foundation

/// Thin, typed wrappers over the documented AXUIElement C API.
/// The product reads only menu structure and menu-item attributes; it never reads document text or window contents.
public enum AX {
    /// AX menu-item modifier bits (HIServices `AXMenuItemModifiers`): 0 means "Command only".
    public struct Modifiers: OptionSet, Hashable {
        public let rawValue: Int
        public init(rawValue: Int) { self.rawValue = rawValue }
        public static let shift     = Modifiers(rawValue: 1 << 0)
        public static let option    = Modifiers(rawValue: 1 << 1)
        public static let control   = Modifiers(rawValue: 1 << 2)
        public static let noCommand = Modifiers(rawValue: 1 << 3)
        public static let commandOnly: Modifiers = []
    }

    public static func app(pid: pid_t) -> AXUIElement {
        let el = AXUIElementCreateApplication(pid)
        // Never block for long if the target app is hung.
        AXUIElementSetMessagingTimeout(el, 1.0)
        return el
    }

    /// PID of the application that currently has keyboard focus, according to the Accessibility system.
    public static func focusedApplicationPID() -> pid_t? {
        let system = AXUIElementCreateSystemWide()
        guard let app = element(system, kAXFocusedApplicationAttribute as String) else { return nil }
        var pid: pid_t = 0
        return AXUIElementGetPid(app, &pid) == .success ? pid : nil
    }

    public static func copy(_ el: AXUIElement, _ attr: String) -> (AXError, CFTypeRef?) {
        var value: CFTypeRef?
        let err = AXUIElementCopyAttributeValue(el, attr as CFString, &value)
        return (err, value)
    }

    public static func element(_ el: AXUIElement, _ attr: String) -> AXUIElement? {
        let (err, value) = copy(el, attr)
        guard err == .success, let v = value, CFGetTypeID(v) == AXUIElementGetTypeID() else { return nil }
        return (v as! AXUIElement)
    }

    public static func children(_ el: AXUIElement) -> [AXUIElement] {
        let (err, value) = copy(el, kAXChildrenAttribute as String)
        guard err == .success, let arr = value as? [AXUIElement] else { return [] }
        return arr
    }

    public static func string(_ el: AXUIElement, _ attr: String) -> String? {
        let (err, value) = copy(el, attr)
        guard err == .success else { return nil }
        return value as? String
    }

    public static func int(_ el: AXUIElement, _ attr: String) -> Int? {
        let (err, value) = copy(el, attr)
        guard err == .success else { return nil }
        return (value as? NSNumber)?.intValue
    }

    public enum BoolRead { case value(Bool), error(AXError) }

    /// Returns the AXError too, so callers can tell "disabled" from "stale reference".
    public static func bool(_ el: AXUIElement, _ attr: String) -> BoolRead {
        let (err, value) = copy(el, attr)
        guard err == .success else { return .error(err) }
        return .value((value as? NSNumber)?.boolValue ?? false)
    }

    public static func press(_ el: AXUIElement) -> AXError {
        AXUIElementPerformAction(el, kAXPressAction as CFString)
    }

    public static func describe(_ err: AXError) -> String {
        switch err {
        case .success: return "success"
        case .apiDisabled: return "apiDisabled (no Accessibility permission)"
        case .invalidUIElement: return "invalidUIElement (stale reference)"
        case .cannotComplete: return "cannotComplete (app busy or gone)"
        case .actionUnsupported: return "actionUnsupported"
        case .attributeUnsupported: return "attributeUnsupported"
        case .notImplemented: return "notImplemented"
        case .failure: return "failure"
        default: return "AXError(\(err.rawValue))"
        }
    }
}
