// swift-tools-version:5.10
// PlainClick. Built with SwiftPM, then wrapped into a .app by scripts/build-app.sh
// (an .app bundle with a stable bundle identifier is needed so macOS can attribute the Accessibility grant).
import PackageDescription

let package = Package(
    name: "PlainClick",
    platforms: [.macOS(.v14)],
    targets: [
        // Pure, testable licensing logic (no AppKit). Verified against the server's signer via a shared test vector.
        .target(
            name: "PlainClickLicensing",
            path: "Sources/PlainClickLicensing"
        ),
        .executableTarget(
            name: "PlainClickPrototype",
            dependencies: ["PlainClickLicensing"],
            path: "Sources/PlainClickPrototype",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("ApplicationServices"),
                .linkedFramework("Carbon"),
                .linkedFramework("Security"),
            ]
        ),
        .testTarget(
            name: "PlainClickLicensingTests",
            dependencies: ["PlainClickLicensing"],
            path: "Tests/PlainClickLicensingTests",
            resources: [.copy("entitlement-v1.json")]
        ),
    ]
)
