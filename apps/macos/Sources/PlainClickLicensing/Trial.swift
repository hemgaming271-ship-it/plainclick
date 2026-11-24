import Foundation

/// Local 7-day trial. Deliberately simple and NOT tamper-proof (documented on the website and in Terms).
public struct TrialPolicy {
    public static let length: TimeInterval = 7 * 24 * 3600

    /// Days remaining, rounded up; 0 when expired. A first-use date in the future (clock moved back) counts as now.
    public static func daysRemaining(firstUse: Date, now: Date = Date()) -> Int {
        let start = min(firstUse, now)
        let left = length - now.timeIntervalSince(start)
        return left <= 0 ? 0 : Int((left / 86_400).rounded(.up))
    }
}

/// How long an activated Mac keeps working without confirming its licence with Dodo.
/// Each successful online check restarts the window, so normal use never notices it.
public enum LicenceGrace {
    public static let days = 30
    public static let length: TimeInterval = TimeInterval(days) * 86_400
    /// Allowed clock drift before a "confirmed" time in the future is distrusted (clock moved back, or an edited file).
    public static let futureTolerance: TimeInterval = 86_400

    /// Whether a licence last confirmed at `lastConfirmed` may still be used offline at `now`.
    public static func isWithinGrace(lastConfirmed: Date, now: Date = Date()) -> Bool {
        if lastConfirmed.timeIntervalSince(now) > futureTolerance { return false }
        return now.timeIntervalSince(lastConfirmed) <= length
    }
}

/// Mirrors the server's key normalisation so the app can reject obvious typos before a network call.
public enum LicenceKeyFormat {
    private static let alphabet = Set("0123456789ABCDEFGHJKMNPQRSTVWXYZ")

    public static func normalise(_ input: String) -> String? {
        var s = input.uppercased().filter { $0.isLetter || $0.isNumber }
        if s.hasPrefix("PLCK") { s.removeFirst(4) }
        s = s.replacingOccurrences(of: "O", with: "0").replacingOccurrences(of: "I", with: "1").replacingOccurrences(of: "L", with: "1")
        guard s.count == 24, s.allSatisfy({ alphabet.contains($0) }) else { return nil }
        return s
    }
}
