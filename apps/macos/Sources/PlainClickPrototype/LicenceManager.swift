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
/// Launch never blocks on the network: once activated, the panel works offline for up to `LicenceGrace.days` days after
/// the last successful check. Checks run at launch, every few hours, and after wake; only an explicit answer from Dodo
/// (for example after a refund) removes the licence. Outages and network trouble never do.
final class LicenceManager: ObservableObject {
    enum State: Equatable {
        case licensed
        /// Activated, but not confirmed online for longer than the offline grace period. The key stays saved; the next
        /// successful check restores `.licensed` without re-entering anything.
        case needsCheck
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
        static let confirmedAt = "licence-confirmed-at"
    }

    static let offlineDays = LicenceGrace.days
    static let recheckInterval: TimeInterval = 6 * 3600
    private var recheckTimer: Timer?
    private var wakeObserver: NSObjectProtocol?
    private var checking = false

    init() {
        recompute()
        validateInBackground()
        recheckTimer = Timer.scheduledTimer(withTimeInterval: Self.recheckInterval, repeats: true) { [weak self] _ in
            self?.validateInBackground()
        }
        wakeObserver = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didWakeNotification, object: nil, queue: .main
        ) { [weak self] _ in
            // Give Wi-Fi a moment to reconnect after wake.
            DispatchQueue.main.asyncAfter(deadline: .now() + 30) { self?.validateInBackground() }
        }
    }

    deinit {
        recheckTimer?.invalidate()
        if let wakeObserver { NSWorkspace.shared.notificationCenter.removeObserver(wakeObserver) }
    }

    var isPanelAllowed: Bool { state != .trialEnded && state != .needsCheck }
    var hasLicence: Bool { state == .licensed }

    /// Trial starts the first time the paid panel is used, not at install.
    func noteTrialUse() {
        if LicenceStore.get(K.trialStart) == nil {
            LicenceStore.set(String(Date().timeIntervalSince1970), for: K.trialStart)
            recompute()
        }
    }

    func recompute() {
        if LicenceStore.get(K.licenceKey) != nil, LicenceStore.get(K.instanceID) != nil {
            guard let raw = LicenceStore.get(K.confirmedAt), let ts = Double(raw) else {
                // Activated by a build from before the offline limit: start its grace period now, so updating
                // never locks out a legitimate activation (even one updated while offline).
                LicenceStore.set(String(Date().timeIntervalSince1970), for: K.confirmedAt)
                state = .licensed
                return
            }
            state = LicenceGrace.isWithinGrace(lastConfirmed: Date(timeIntervalSince1970: ts)) ? .licensed : .needsCheck
            return
        }
        guard let startString = LicenceStore.get(K.trialStart), let ts = Double(startString) else {
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
                if LicenceStore.set(key, for: K.licenceKey), LicenceStore.set(instanceID, for: K.instanceID),
                   LicenceStore.set(String(Date().timeIntervalSince1970), for: K.confirmedAt) {
                    message = "Activated. Thank you for buying PlainClick."
                } else {
                    // Without saved credentials this Mac stays locked and can't free its slot later, so give the slot back now.
                    _ = try? await send(LicenceConfig.api.deactivateRequest(key: key, instanceID: instanceID))
                    LicenceStore.delete(K.licenceKey)
                    LicenceStore.delete(K.instanceID)
                    LicenceStore.delete(K.confirmedAt)
                    message = "PlainClick couldn't save your licence on this Mac, so it wasn't activated. Check your disk has free space and try again."
                }
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
        guard let key = LicenceStore.get(K.licenceKey), let instance = LicenceStore.get(K.instanceID) else { return }
        busy = true
        defer { busy = false }
        do {
            let (status, _) = try await send(LicenceConfig.api.deactivateRequest(key: key, instanceID: instance))
            guard DodoLicenceAPI.isSuccess(status: status) else {
                message = "Deactivation failed (HTTP \(status)). Your licence is still active here."
                return
            }
            LicenceStore.delete(K.instanceID)
            LicenceStore.delete(K.licenceKey)
            LicenceStore.delete(K.confirmedAt)
            message = "This Mac is deactivated. You can activate another Mac now."
        } catch {
            message = "Couldn't reach the server, so nothing changed. Try again when you're online."
        }
        recompute()
    }

    /// Background check. Network errors, outages and unclear answers change nothing (the offline grace period covers
    /// them); a confirmed licence restarts the grace period; only an explicit answer from Dodo removes the licence.
    func validateInBackground() {
        Task { await self.check(userInitiated: false) }
    }

    /// "Check Now" from Settings.
    @MainActor
    func checkNow() async {
        busy = true
        defer { busy = false }
        await check(userInitiated: true)
    }

    @MainActor
    private func check(userInitiated: Bool) async {
        guard !checking, let key = LicenceStore.get(K.licenceKey), let instance = LicenceStore.get(K.instanceID) else { return }
        checking = true
        defer { checking = false }
        let result = try? await send(LicenceConfig.api.validateRequest(key: key, instanceID: instance))
        // Deactivated or replaced while the request was in flight: ignore the stale answer.
        guard LicenceStore.get(K.licenceKey) == key, LicenceStore.get(K.instanceID) == instance else { return }
        switch result.map({ DodoLicenceAPI.parseValidate(status: $0.0, data: $0.1) }) ?? .unknown {
        case .valid:
            LicenceStore.set(String(Date().timeIntervalSince1970), for: K.confirmedAt)
            if userInitiated || state == .needsCheck { message = "Licence confirmed." }
        case .invalid:
            LicenceStore.delete(K.instanceID)
            LicenceStore.delete(K.confirmedAt)
            message = "This licence is no longer active on this Mac (for example after a refund, or it was deactivated elsewhere)."
        case .unknown:
            if userInitiated || state == .needsCheck {
                message = "Couldn't reach the licence server. Your licence is still saved here; PlainClick will try again when you're online."
            }
        }
        recompute()
    }
}
