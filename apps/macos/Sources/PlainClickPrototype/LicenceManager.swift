import AppKit
import Foundation
import PlainClickLicensing

/// Build-time licensing configuration, read from Info.plist (set by scripts/build-app.sh from DODO_ENV / DODO_PRODUCT_ID).
enum LicenceConfig {
    static let environment: DodoEnvironment =
        DodoEnvironment(rawValue: (Bundle.main.object(forInfoDictionaryKey: "PCDodoEnvironment") as? String) ?? "") ?? .test
    static let productID = (Bundle.main.object(forInfoDictionaryKey: "PCDodoProductID") as? String) ?? ""
    static let api = DodoLicenceAPI(environment: environment, expectedProductID: productID)
}

/// Holds licence + trial state. Licence keys are issued and limited (2 Macs) by Dodo Payments; see DodoLicence.swift.
/// Launch never blocks on the network: once activated, the panel works offline. A background check runs when online
/// and only removes the licence when Dodo explicitly answers `valid: false` (for example after a refund).
final class LicenceManager: ObservableObject {
    enum State: Equatable {
        case licensed
        case trial(daysLeft: Int)
        case trialEnded
    }

    @Published private(set) var state: State = .trialEnded
    @Published var busy = false
    @Published var message = ""

    private enum K {
        static let licenceKey = "dodo-licence-key"
        static let instanceID = "dodo-instance-id"
        static let trialStart = "trial-start"
    }

    init() {
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
        if Keychain.get(K.licenceKey) != nil, Keychain.get(K.instanceID) != nil {
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

    /// Hardware model only (e.g. "Mac14,2"). Never the computer name, which often contains a person's name.
    static func hardwareModel() -> String {
        var size = 0
        sysctlbyname("hw.model", nil, &size, nil, 0)
        guard size > 0 else { return "Mac" }
        var buf = [CChar](repeating: 0, count: size)
        sysctlbyname("hw.model", &buf, &size, nil, 0)
        return String(cString: buf)
    }

    private func send(_ req: URLRequest) async throws -> (Int, Data) {
        let (data, resp) = try await URLSession.shared.data(for: req)
        return ((resp as? HTTPURLResponse)?.statusCode ?? 0, data)
    }

    @MainActor
    func activate(key raw: String) async {
        guard let key = DodoKeyInput.clean(raw) else {
            message = "That doesn't look like a licence key. Copy it from your purchase email and paste it here."
            return
        }
        busy = true
        defer { busy = false }
        do {
            let (status, data) = try await send(LicenceConfig.api.activateRequest(key: key, instanceName: Self.hardwareModel()))
            switch LicenceConfig.api.parseActivate(status: status, data: data) {
            case .activated(let instanceID):
                Keychain.set(key, for: K.licenceKey)
                Keychain.set(instanceID, for: K.instanceID)
                message = "Activated. Thank you for buying PlainClick."
            case .limitReached:
                message = "This key is already active on 2 Macs. Deactivate it on one of them first (PlainClick › Settings › Licence), or contact support if that Mac is lost."
            case .notActive:
                message = "This key isn't active (for example, the order was refunded). Contact support if you think this is wrong."
            case .notFound:
                message = "We couldn't find that key. Check you copied all of it from your purchase email."
            case .wrongProduct:
                message = "That key is for a different product, not PlainClick."
            case .failed(let status):
                message = "Activation failed (HTTP \(status)). Please try again in a minute."
            }
        } catch {
            message = "Couldn't reach the activation server. Check your connection and try again."
        }
        recompute()
    }

    @MainActor
    func deactivateThisMac() async {
        guard let key = Keychain.get(K.licenceKey), let instance = Keychain.get(K.instanceID) else { return }
        busy = true
        defer { busy = false }
        do {
            let (status, _) = try await send(LicenceConfig.api.deactivateRequest(key: key, instanceID: instance))
            guard DodoLicenceAPI.isSuccess(status: status) else {
                message = "Deactivation failed (HTTP \(status)). Your licence is still active here."
                return
            }
            Keychain.delete(K.instanceID)
            Keychain.delete(K.licenceKey)
            message = "This Mac is deactivated. You can activate another Mac now."
        } catch {
            message = "Couldn't reach the server, so nothing changed. Try again when you're online."
        }
        recompute()
    }

    /// Opportunistic check. Network errors and unclear answers are ignored (offline use is promised).
    func validateInBackground() {
        guard let key = Keychain.get(K.licenceKey), let instance = Keychain.get(K.instanceID) else { return }
        Task {
            guard let result = try? await self.send(LicenceConfig.api.validateRequest(key: key, instanceID: instance)) else { return }
            if DodoLicenceAPI.parseValidate(status: result.0, data: result.1) == .invalid {
                Keychain.delete(K.instanceID)
                await MainActor.run {
                    self.message = "This licence is no longer active on this Mac (for example after a refund, or it was deactivated elsewhere)."
                    self.recompute()
                }
            }
        }
    }
}
