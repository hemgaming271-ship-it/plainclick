import XCTest
@testable import PlainClickLicensing

final class EntitlementTests: XCTestCase {
    struct Vector: Decodable {
        let publicKeyRawB64: String
        let installationId: String
        let valid: String
        let tampered: String
    }

    func vector() throws -> Vector {
        let url = try XCTUnwrap(Bundle.module.url(forResource: "entitlement-v1", withExtension: "json"))
        return try JSONDecoder().decode(Vector.self, from: Data(contentsOf: url))
    }

    func testAcceptsServerSignedEntitlement() throws {
        let v = try vector()
        let verifier = try EntitlementVerifier(publicKeyRawBase64: v.publicKeyRawB64)
        let p = try verifier.verify(v.valid, installationID: v.installationId.lowercased())
        XCTAssertEqual(p.major, 1)
        XCTAssertEqual(p.product, "plainclick")
    }

    func testRejectsTamperedPayload() throws {
        let v = try vector()
        let verifier = try EntitlementVerifier(publicKeyRawBase64: v.publicKeyRawB64)
        XCTAssertThrowsError(try verifier.verify(v.tampered, installationID: v.installationId)) {
            XCTAssertEqual($0 as? EntitlementError, .badSignature)
        }
    }

    func testRejectsOtherInstallation() throws {
        let v = try vector()
        let verifier = try EntitlementVerifier(publicKeyRawBase64: v.publicKeyRawB64)
        XCTAssertThrowsError(try verifier.verify(v.valid, installationID: UUID().uuidString)) {
            XCTAssertEqual($0 as? EntitlementError, .wrongInstallation)
        }
    }

    func testRejectsDifferentKey() throws {
        let v = try vector()
        let other = Curve25519Helper.randomPublicKeyB64()
        let verifier = try EntitlementVerifier(publicKeyRawBase64: other)
        XCTAssertThrowsError(try verifier.verify(v.valid, installationID: v.installationId))
    }

    func testRejectsGarbage() throws {
        let v = try vector()
        let verifier = try EntitlementVerifier(publicKeyRawBase64: v.publicKeyRawB64)
        for bad in ["", "pc1..", "pc2.a.b", "pc1.!!!.???"] {
            XCTAssertThrowsError(try verifier.verify(bad, installationID: v.installationId))
        }
    }

    func testTrialDays() {
        let now = Date()
        XCTAssertEqual(TrialPolicy.daysRemaining(firstUse: now, now: now), 7)
        XCTAssertEqual(TrialPolicy.daysRemaining(firstUse: now.addingTimeInterval(-6.5 * 86_400), now: now), 1)
        XCTAssertEqual(TrialPolicy.daysRemaining(firstUse: now.addingTimeInterval(-8 * 86_400), now: now), 0)
        XCTAssertEqual(TrialPolicy.daysRemaining(firstUse: now.addingTimeInterval(86_400), now: now), 7)
    }

    func testKeyNormalisation() {
        XCTAssertEqual(LicenceKeyFormat.normalise("plck-7kq2 m9xa-0000-1111-2222-3333"), "7KQ2M9XA0000111122223333")
        XCTAssertNil(LicenceKeyFormat.normalise("PLCK-1234"))
    }
}

import CryptoKit
enum Curve25519Helper {
    static func randomPublicKeyB64() -> String {
        Curve25519.Signing.PrivateKey().publicKey.rawRepresentation.base64EncodedString()
    }
}
