import AppKit

/// Local-only CSV log used to record Phase 0 test runs. Never uploaded. OFF unless running the UI tests/demo or the
/// user opts in with `defaults write <bundle id> DiagnosticLogging -bool YES` (for support).
/// Deliberately records NO window titles, document names, menu titles, URLs or text — only IDs, versions and outcomes.
/// Location: ~/Library/Logs/PlainClickPrototype/trials.csv
enum TrialLog {
    static let isEnabled: Bool = {
        let args = ProcessInfo.processInfo.arguments
        return args.contains("--ui-test") || args.contains("--demo") || UserDefaults.standard.bool(forKey: "DiagnosticLogging")
    }()

    static let directory: URL = {
        let dir = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Logs/PlainClickPrototype", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }()

    static let fileURL = directory.appendingPathComponent("trials.csv")
    private static let header = "timestamp,macos,target_bundle_id,target_version,action_id,outcome,latency_ms,detail\n"
    private static let iso = ISO8601DateFormatter()

    static func appVersion(_ app: NSRunningApplication?) -> String {
        guard let url = app?.bundleURL, let info = Bundle(url: url)?.infoDictionary else { return "unknown" }
        let short = info["CFBundleShortVersionString"] as? String ?? "?"
        let build = info["CFBundleVersion"] as? String ?? "?"
        return "\(short) (\(build))"
    }

    /// Quotes are swapped out, and a leading formula character is neutralised so a spreadsheet never evaluates a field.
    static func sanitize(_ field: String) -> String {
        let cleaned = field.replacingOccurrences(of: "\"", with: "'")
        guard let first = cleaned.first, "=+-@\t\r".contains(first) else { return cleaned }
        return "'" + cleaned
    }

    static func record(app: NSRunningApplication?, actionID: String, outcome: String, latencyMs: Int, detail: String = "") {
        guard isEnabled else { return }
        let fields = [
            iso.string(from: Date()),
            ProcessInfo.processInfo.operatingSystemVersionString,
            app?.bundleIdentifier ?? "none",
            appVersion(app),
            actionID,
            outcome,
            String(latencyMs),
            detail,
        ].map { "\"" + sanitize($0) + "\"" }
        let line = fields.joined(separator: ",") + "\n"
        let fm = FileManager.default
        if !fm.fileExists(atPath: fileURL.path) {
            try? header.write(to: fileURL, atomically: true, encoding: .utf8)
        }
        if let handle = try? FileHandle(forWritingTo: fileURL) {
            defer { try? handle.close() }
            _ = try? handle.seekToEnd()
            try? handle.write(contentsOf: Data(line.utf8))
        }
    }
}
