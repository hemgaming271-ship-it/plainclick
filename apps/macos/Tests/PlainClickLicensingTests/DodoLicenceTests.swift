import XCTest
@testable import PlainClickLicensing

final class DodoLicenceTests: XCTestCase {
    let api = DodoLicenceAPI(environment: .live, expectedProductID: "pdt_plainclick")

    private func body(_ req: URLRequest) -> [String: String] {
        (try? JSONSerialization.jsonObject(with: req.httpBody ?? Data())) as? [String: String] ?? [:]
    }

    func testRequestsHitDodoPublicEndpointsWithoutAnAPIKey() {
        let a = api.activateRequest(key: "KEY-123456", instanceName: "Mac14,2")
        XCTAssertEqual(a.url?.absoluteString, "https://live.dodopayments.com/licenses/activate")
        XCTAssertEqual(a.httpMethod, "POST")
        XCTAssertEqual(body(a), ["license_key": "KEY-123456", "name": "Mac14,2"])
        XCTAssertNil(a.value(forHTTPHeaderField: "Authorization"), "the app must never ship an API key")

        let v = DodoLicenceAPI(environment: .test, expectedProductID: nil).validateRequest(key: "K-12345678", instanceID: "lki_1")
        XCTAssertEqual(v.url?.absoluteString, "https://test.dodopayments.com/licenses/validate")
        XCTAssertEqual(body(v), ["license_key": "K-12345678", "license_key_instance_id": "lki_1"])

        let d = api.deactivateRequest(key: "K-12345678", instanceID: "lki_1")
        XCTAssertEqual(d.url?.absoluteString, "https://live.dodopayments.com/licenses/deactivate")
        XCTAssertEqual(body(d), ["license_key": "K-12345678", "license_key_instance_id": "lki_1"])
    }

    func testActivateParsing() {
        let ok = #"{"id":"lki_abc","license_key_id":"lic_1","product":{"product_id":"pdt_plainclick"}}"#.data(using: .utf8)!
        XCTAssertEqual(api.parseActivate(status: 201, data: ok), .activated(instanceID: "lki_abc"))
        let other = #"{"id":"lki_abc","product":{"product_id":"pdt_other"}}"#.data(using: .utf8)!
        XCTAssertEqual(api.parseActivate(status: 201, data: other), .wrongProduct)
        XCTAssertEqual(DodoLicenceAPI(environment: .live, expectedProductID: "").parseActivate(status: 201, data: other), .activated(instanceID: "lki_abc"))
        XCTAssertEqual(api.parseActivate(status: 201, data: Data("{}".utf8)), .failed(status: 201))
        XCTAssertEqual(api.parseActivate(status: 403, data: Data()), .notActive)
        XCTAssertEqual(api.parseActivate(status: 404, data: Data()), .notFound)
        XCTAssertEqual(api.parseActivate(status: 422, data: Data()), .limitReached)
        XCTAssertEqual(api.parseActivate(status: 500, data: Data()), .failed(status: 500))
    }

    func testValidateOnlyAnExplicitDodoAnswerRevokes() {
        XCTAssertEqual(DodoLicenceAPI.parseValidate(status: 200, data: Data(#"{"valid":true}"#.utf8)), .valid)
        XCTAssertEqual(DodoLicenceAPI.parseValidate(status: 200, data: Data(#"{"valid":false}"#.utf8)), .invalid)
        // Dodo's JSON errors for a disabled/refunded or unknown key/instance.
        let inactive = Data(#"{"code":"INACTIVE_LICENSE_KEY","message":"License key is not active"}"#.utf8)
        XCTAssertEqual(DodoLicenceAPI.parseValidate(status: 403, data: inactive), .invalid)
        XCTAssertEqual(DodoLicenceAPI.parseValidate(status: 404, data: Data(#"{"code":"NOT_FOUND","message":"x"}"#.utf8)), .invalid)
        // Outages, captive portals, HTML error pages, odd shapes: never treated as a revocation.
        XCTAssertEqual(DodoLicenceAPI.parseValidate(status: 500, data: Data(#"{"valid":false}"#.utf8)), .unknown)
        XCTAssertEqual(DodoLicenceAPI.parseValidate(status: 503, data: inactive), .unknown)
        XCTAssertEqual(DodoLicenceAPI.parseValidate(status: 403, data: Data("<html>Forbidden</html>".utf8)), .unknown)
        XCTAssertEqual(DodoLicenceAPI.parseValidate(status: 404, data: Data(#"{"message":"no code"}"#.utf8)), .unknown)
        XCTAssertEqual(DodoLicenceAPI.parseValidate(status: 429, data: inactive), .unknown)
        XCTAssertEqual(DodoLicenceAPI.parseValidate(status: 200, data: Data("<html>".utf8)), .unknown)
        XCTAssertEqual(DodoLicenceAPI.parseValidate(status: 200, data: Data(#"{"valid":"no"}"#.utf8)), .unknown)
    }

    func testOfflineGraceIsBoundedAndDistrustsFutureDates() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        XCTAssertTrue(LicenceGrace.isWithinGrace(lastConfirmed: now, now: now))
        XCTAssertTrue(LicenceGrace.isWithinGrace(lastConfirmed: now.addingTimeInterval(-29 * 86_400), now: now))
        XCTAssertTrue(LicenceGrace.isWithinGrace(lastConfirmed: now.addingTimeInterval(-LicenceGrace.length), now: now))
        XCTAssertFalse(LicenceGrace.isWithinGrace(lastConfirmed: now.addingTimeInterval(-LicenceGrace.length - 1), now: now))
        // Small clock drift is fine; a date far in the future (clock moved back / edited file) needs an online check.
        XCTAssertTrue(LicenceGrace.isWithinGrace(lastConfirmed: now.addingTimeInterval(3600), now: now))
        XCTAssertFalse(LicenceGrace.isWithinGrace(lastConfirmed: now.addingTimeInterval(3 * 86_400), now: now))
        XCTAssertFalse(LicenceGrace.isWithinGrace(lastConfirmed: .distantFuture, now: now))
    }

    func testKeyInputCleaning() {
        XCTAssertEqual(DodoKeyInput.clean("  2b1f8e2d-c41e-4e8f-b2d3-d9fd61c38f43\n"), "2b1f8e2d-c41e-4e8f-b2d3-d9fd61c38f43")
        XCTAssertEqual(DodoKeyInput.clean("\"ABCD-1234-EFGH\""), "ABCD-1234-EFGH")
        XCTAssertNil(DodoKeyInput.clean(""))
        XCTAssertNil(DodoKeyInput.clean("short"))
        XCTAssertNil(DodoKeyInput.clean("two words-here"))
        XCTAssertNil(DodoKeyInput.clean(String(repeating: "A", count: 200)))
        XCTAssertNil(DodoKeyInput.clean("ключ-12345678"))
    }
}
