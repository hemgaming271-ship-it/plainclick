import AppKit
import Foundation
import PlainClickLicensing

/// Build-time licensing configuration.
enum LicenceConfig {
    /// Raw Ed25519 public key (base64) from `npm run keys:generate`. Safe to ship. EMPTY = licensing disabled (dev).
    static let publicKeyRawBase64 = ""
    /// Licensing API origin, e.g. https://your-domain.example. EMPTY = activation unavailable (dev).
    static let apiBase = ""
    static let appMajorVersion = 1
}

/// Holds licence + trial state. Launch never blocks on the network: a cached, verified entitlement unlocks the panel
/// offline; an online check runs in the background and only ever *removes* access on an explicit server answer.
final class LicenceManager: ObservableObject {
    enum State: Equatable {
        case licensed
        case trial(daysLeft: Int)
        case trialEnded
    }

    @Published private(set) var state: State = .trialEnded
    @Published var busy = false
    @Published var message = ""

    let installationID: String
    private let verifier: EntitlementVerifier?

    private enum K {
        static let installationID = "installation-id"
        static let licenceKey = "licence-key"
        static let entitlement = "entitlement"
        static let trialStart = "trial-start"
    }

    init() {
        if let id = Keychain.get(K.installationID) {
            installationID = id
        } else {
            let id = UUID().uuidString // random; not derived from hardware
            Keychain.set(id, for: K.installationID)
            installationID = id
        }
        verifier = LicenceConfig.publicKeyRawBase64.isEmpty
            ? nil
            : try? EntitlementVerifier(publicKeyRawBase64: LicenceConfig.publicKeyRawBase64, appMajorVersion: LicenceConfig.appMajorVersion)
        recompute()
        validateInBackground()
    }

    var isPanelAllowed: Bool { state != .trialEnded }
    var hasLicence: Bool { state == .licensed }

    /// Trial starts the first time the paid panel is used, not at install.
    func noteTrialUse() {
        if Keychain.get(K.trialStart) == nil {
            Keychain.set(String(Date().timeIntervalSince1970), for: K.trialStart)
            recompute()
        }
    }

    func recompute() {
        if let token = Keychain.get(K.entitlement), let verifier, (try? verifier.verify(token, installationID: installationID)) != nil {
            state = .licensed
            return
        }
        guard let startString = Keychain.get(K.trialStart), let ts = Double(startString) else {
            state = .trial(daysLeft: 7)
            return
        }
        let days = TrialPolicy.daysRemaining(firstUse: Date(timeIntervalSince1970: ts))
        state = days > 0 ? .trial(daysLeft: days) : .trialEnded
    }

    static func hardwareModel() -> String {
        var size = 0
        sysctlbyname("hw.model", nil, &size, nil, 0)
        guard size > 0 else { return "Mac" }
        var buf = [CChar](repeating: 0, count: size)
        sysctlbyname("hw.model", &buf, &size, nil, 0)
        return String(cString: buf)
    }

    // MARK: Network

    private func post(_ path: String, _ body: [String: String]) async throws -> (Int, [String: Any]) {
        guard !LicenceConfig.apiBase.isEmpty, let url = URL(string: LicenceConfig.apiBase + path) else {
            throw URLError(.unsupportedURL)
        }
        var req = URLRequest(url: url, timeoutInterval: 15)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, resp) = try await URLSession.shared.data(for: req)
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        return ((resp as? HTTPURLResponse)?.statusCode ?? 0, json)
    }

    @MainActor
    func activate(key raw: String) async {
        guard LicenceKeyFormat.normalise(raw) != nil else {
            message = "That doesn't look like a PlainClick key. It starts with PLCK- and has 6 groups of 4 characters."
            return
        }
        busy = true
        defer { busy = false }
        do {
            let (status, json) = try await post("/api/licences/activate", [
                "licenceKey": raw,
                "installationId": installationID,
                "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0",
                // Hardware model only (e.g. "Mac14,2") — not the computer name, which often contains a person's name.
                "deviceLabel": Self.hardwareModel(),
            ])
            if status == 200, let token = json["entitlement"] as? String, let verifier,
               (try? verifier.verify(token, installationID: installationID)) != nil {
                Keychain.set(raw, for: K.licenceKey)
                Keychain.set(token, for: K.entitlement)
                message = "Activated. Thank you for buying PlainClick."
            } else {
                message = json["message"] as? String ?? "Activation failed (HTTP \(status))."
            }
        } catch {
            message = "Couldn't reach the activation server. Check your connection and try again."
        }
        recompute()
    }

    @MainActor
    func deactivateThisMac() async {
        guard let key = Keychain.get(K.licenceKey) else { return }
        busy = true
        defer { busy = false }
        do {
            let (status, _) = try await post("/api/licences/deactivate", ["licenceKey": key, "installationId": installationID])
            guard status == 200 else {
                message = "Deactivation failed (HTTP \(status)). Your licence is still active here."
                return
            }
            Keychain.delete(K.entitlement)
            Keychain.delete(K.licenceKey)
            message = "This Mac is deactivated. You can activate another Mac now."
        } catch {
            message = "Couldn't reach the server, so nothing changed. Try again when you're online."
        }
        recompute()
    }

    /// Opportunistic check. Network errors are ignored (offline use is promised). Only explicit
    /// "revoked"/"deactivated" answers remove the cached entitlement.
    func validateInBackground() {
        guard let token = Keychain.get(K.entitlement), !LicenceConfig.apiBase.isEmpty else { return }
        Task { [installationID] in
            guard let result = try? await self.post("/api/licences/validate", ["entitlement": token, "installationId": installationID]),
                  result.0 == 200, let answer = result.1["status"] as? String else { return }
            if answer == "revoked" || answer == "deactivated" {
                Keychain.delete(K.entitlement)
                await MainActor.run {
                    self.message = answer == "revoked" ? "This licence is no longer active (for example after a refund)." : "This Mac was deactivated from another place."
                    self.recompute()
                }
            }
        }
    }
}
