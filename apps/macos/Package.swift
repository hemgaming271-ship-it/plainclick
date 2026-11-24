// swift-tools-version:5.10
// PlainClick. Built with SwiftPM, then wrapped into a .app by scripts/build-app.sh
// (an .app bundle with a stable bundle identifier is needed so macOS can attribute the Accessibility grant).
import PackageDescription

let package = Package(
    name: "PlainClick",
    platforms: [.macOS(.v14)],
    dependencies: [
        // In-app updates: EdDSA-signed, installed in place, so macOS doesn't block each new version again.
        .package(url: "https://github.com/sparkle-project/Sparkle", exact: "2.10.1"),
    ],
    targets: [
        // Pure, testable licensing logic (no AppKit). Verified against the server's signer via a shared test vector.
        .target(
            name: "PlainClickLicensing",
            path: "Sources/PlainClickLicensing"
        ),
        // Accessibility command engine shared by the app and the feasibility harness.
        .target(
            name: "PlainClickCore",
            path: "Sources/PlainClickCore",
            linkerSettings: [.linkedFramework("ApplicationServices")]
        ),
        // Automated Phase 0 tests against real TextEdit / Finder / Safari (runs on a GitHub macOS runner or any Mac).
        .executableTarget(
            name: "plainclick-feasibility",
            dependencies: ["PlainClickCore"],
            path: "Sources/Feasibility",
            linkerSettings: [.linkedFramework("AppKit"), .linkedFramework("ApplicationServices")]
        ),
        .executableTarget(
            name: "PlainClickPrototype",
            dependencies: ["PlainClickLicensing", "PlainClickCore", .product(name: "Sparkle", package: "Sparkle")],
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
