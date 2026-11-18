import Foundation

/// Dodo Payments licence keys (free, no server of our own).
///
/// Dodo generates a key per purchase, emails it to the buyer, and enforces the activation limit (set to 2 Macs on the
/// product). The app talks to Dodo's PUBLIC licence endpoints — no API key is shipped in the app:
///   POST {base}/licenses/activate   { license_key, name }                      → 201 { id: "lki_…", product: { product_id } }
///   POST {base}/licenses/validate   { license_key, license_key_instance_id }   → 200 { valid: Bool }
///   POST {base}/licenses/deactivate { license_key, license_key_instance_id }   → 2xx
/// Errors on activate: 403 key not active (e.g. disabled), 404 not found, 422 activation limit reached.
/// Written from Dodo's API reference (2026-11-18). VERIFY with one real test-mode key before selling.
///
/// Like the trial, the local "licensed" state is NOT tamper-proof; it's a fair-use check for a US$5.99 app.
public enum DodoEnvironment: String, Sendable {
    case test, live
    public var baseURL: URL {
        URL(string: self == .live ? "https://live.dodopayments.com" : "https://test.dodopayments.com")!
    }
}

public struct DodoLicenceAPI: Sendable {
    public let environment: DodoEnvironment
    /// If set, a key must belong to this product (stops keys for other products of the same store unlocking the app).
    public let expectedProductID: String?

    public init(environment: DodoEnvironment, expectedProductID: String?) {
        self.environment = environment
        let p = expectedProductID?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        self.expectedProductID = p.isEmpty ? nil : p
    }

    // MARK: Requests

    public func activateRequest(key: String, instanceName: String) -> URLRequest {
        request("/licenses/activate", ["license_key": key, "name": instanceName])
    }

    public func validateRequest(key: String, instanceID: String) -> URLRequest {
        request("/licenses/validate", ["license_key": key, "license_key_instance_id": instanceID])
    }

    public func deactivateRequest(key: String, instanceID: String) -> URLRequest {
        request("/licenses/deactivate", ["license_key": key, "license_key_instance_id": instanceID])
    }

    private func request(_ path: String, _ body: [String: String]) -> URLRequest {
        var req = URLRequest(url: environment.baseURL.appendingPathComponent(String(path.dropFirst())), timeoutInterval: 15)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body, options: [.sortedKeys])
        return req
    }

    // MARK: Responses

    public enum ActivateResult: Equatable, Sendable {
        case activated(instanceID: String)
        case wrongProduct
        case notActive       // 403: disabled / refunded / expired
        case notFound        // 404
        case limitReached    // 422
        case failed(status: Int)
    }

    public func parseActivate(status: Int, data: Data) -> ActivateResult {
        switch status {
        case 200, 201:
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
            guard let id = json["id"] as? String, !id.isEmpty else { return .failed(status: status) }
            if let expected = expectedProductID {
                let product = (json["product"] as? [String: Any])?["product_id"] as? String
                guard product == expected else { return .wrongProduct }
            }
            return .activated(instanceID: id)
        case 403: return .notActive
        case 404: return .notFound
        case 422: return .limitReached
        default: return .failed(status: status)
        }
    }

    public enum ValidateResult: Equatable, Sendable {
        case valid
        /// Dodo explicitly answered `valid: false`. Only this removes a licence; network trouble never does.
        case invalid
        case unknown
    }

    public static func parseValidate(status: Int, data: Data) -> ValidateResult {
        guard status == 200,
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let valid = json["valid"] as? Bool else { return .unknown }
        return valid ? .valid : .invalid
    }

    public static func isSuccess(status: Int) -> Bool { (200..<300).contains(status) }
}

/// Cleans a pasted key: trims whitespace/quotes, rejects empty, multi-line or absurdly long input before any network call.
public enum DodoKeyInput {
    public static func clean(_ raw: String) -> String? {
        let s = raw.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines.union(CharacterSet(charactersIn: "\"'“”‘’")))
        guard (8...128).contains(s.count), !s.contains(where: { $0.isWhitespace || $0.isNewline }) else { return nil }
        guard s.unicodeScalars.allSatisfy({ $0.isASCII && $0.value > 32 }) else { return nil }
        return s
    }
}
