import CryptoKit
import Foundation

/// Mirrors packages/licence-contracts/README.md. Token: "pc1." + base64url(payload JSON bytes) + "." + base64url(Ed25519 sig).
public struct EntitlementPayload: Codable, Equatable {
    public let v: Int
    public let product: String
    public let major: Int
    public let kind: String
    public let lid: String
    public let iid: String
    public let iat: Int
}

public enum EntitlementError: Error, Equatable {
    case malformed, badSignature, wrongProduct, wrongInstallation, unsupportedMajor
}

public struct EntitlementVerifier {
    private let publicKey: Curve25519.Signing.PublicKey
    /// The major version this build of the app is licensed under.
    public let appMajorVersion: Int

    /// - Parameter publicKeyRawBase64: 32-byte raw Ed25519 public key (base64), as printed by `npm run keys:generate`.
    public init(publicKeyRawBase64: String, appMajorVersion: Int = 1) throws {
        guard let raw = Data(base64Encoded: publicKeyRawBase64), raw.count == 32 else { throw EntitlementError.malformed }
        publicKey = try Curve25519.Signing.PublicKey(rawRepresentation: raw)
        self.appMajorVersion = appMajorVersion
    }

    /// Verifies the signature over the exact payload bytes first, then decodes and checks the claims.
    public func verify(_ token: String, installationID: String) throws -> EntitlementPayload {
        let parts = token.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 3, parts[0] == "pc1",
              let payloadBytes = Data(base64URL: String(parts[1])),
              let signature = Data(base64URL: String(parts[2])), signature.count == 64
        else { throw EntitlementError.malformed }
        guard publicKey.isValidSignature(signature, for: payloadBytes) else { throw EntitlementError.badSignature }
        guard let payload = try? JSONDecoder().decode(EntitlementPayload.self, from: payloadBytes) else { throw EntitlementError.malformed }
        guard payload.v == 1, payload.product == "plainclick", payload.kind == "perpetual" else { throw EntitlementError.wrongProduct }
        guard payload.iid.caseInsensitiveCompare(installationID) == .orderedSame else { throw EntitlementError.wrongInstallation }
        guard payload.major == appMajorVersion else { throw EntitlementError.unsupportedMajor }
        return payload
    }
}

public extension Data {
    init?(base64URL s: String) {
        var b = s.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while b.count % 4 != 0 { b += "=" }
        self.init(base64Encoded: b)
    }
}
