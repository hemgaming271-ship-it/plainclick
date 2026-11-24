import Foundation
import XCTest
@testable import PlainClickLicensing

final class LicenceStoreTests: XCTestCase {
    private var dir: URL!

    override func setUp() {
        dir = FileManager.default.temporaryDirectory.appendingPathComponent("LicenceStoreTests-\(UUID().uuidString)")
        LicenceStore.directory = dir
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: dir)
    }

    func testRoundTripAndDelete() {
        XCTAssertNil(LicenceStore.get("trial-start"))
        XCTAssertTrue(LicenceStore.set("123", for: "trial-start"))
        XCTAssertTrue(LicenceStore.set("key", for: "dodo-licence-key"))
        XCTAssertEqual(LicenceStore.get("trial-start"), "123")
        XCTAssertTrue(LicenceStore.set("456", for: "trial-start"))
        XCTAssertEqual(LicenceStore.get("trial-start"), "456")
        LicenceStore.delete("trial-start")
        XCTAssertNil(LicenceStore.get("trial-start"))
        XCTAssertEqual(LicenceStore.get("dodo-licence-key"), "key")
    }

    func testFileIsPrivateToTheUser() throws {
        XCTAssertTrue(LicenceStore.set("v", for: "a"))
        let fm = FileManager.default
        let filePerms = try fm.attributesOfItem(atPath: LicenceStore.fileURL.path)[.posixPermissions] as? Int
        let dirPerms = try fm.attributesOfItem(atPath: dir.path)[.posixPermissions] as? Int
        XCTAssertEqual(filePerms, 0o600)
        XCTAssertEqual(dirPerms, 0o700)
    }

    func testCorruptFileReadsAsEmpty() throws {
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try Data("not a plist".utf8).write(to: LicenceStore.fileURL)
        XCTAssertNil(LicenceStore.get("a"))
        XCTAssertTrue(LicenceStore.set("v", for: "a"))
        XCTAssertEqual(LicenceStore.get("a"), "v")
    }
}
