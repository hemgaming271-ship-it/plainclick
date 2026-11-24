import Foundation

/// Licence key, installation ID and trial start, kept in a property list only this user can read
/// (~/Library/Application Support/<bundle id>/licence.plist, folder 0700, file 0600).
///
/// Not the login Keychain: self-signed builds have no Apple Team ID, so macOS ties each Keychain item to the code hash
/// of the build that wrote it and asks for the login password after every update. Values that older builds wrote to
/// the Keychain are moved here the first time they are read (macOS may ask once for that move).
public enum LicenceStore {
    private static let lock = NSLock()

    /// Overridable for tests.
    public static var directory: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Application Support")
        return base.appendingPathComponent(Bundle.main.bundleIdentifier ?? "PlainClick", isDirectory: true)
    }()

    static var fileURL: URL { directory.appendingPathComponent("licence.plist") }

    public static func get(_ account: String) -> String? {
        lock.lock(); defer { lock.unlock() }
        return load()[account]
    }

    @discardableResult
    public static func set(_ value: String, for account: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        var values = load()
        values[account] = value
        return save(values)
    }

    public static func delete(_ account: String) {
        lock.lock(); defer { lock.unlock() }
        var values = load()
        values[account] = nil
        _ = save(values)
    }

    private static func load() -> [String: String] {
        guard let data = try? Data(contentsOf: fileURL),
              let values = try? PropertyListDecoder().decode([String: String].self, from: data)
        else { return [:] }
        return values
    }

    private static func save(_ values: [String: String]) -> Bool {
        let fm = FileManager.default
        do {
            try fm.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
            try fm.setAttributes([.posixPermissions: 0o700], ofItemAtPath: directory.path)
            let data = try PropertyListEncoder().encode(values)
            try data.write(to: fileURL, options: .atomic)
            try fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: fileURL.path)
            return true
        } catch {
            return false
        }
    }
}
