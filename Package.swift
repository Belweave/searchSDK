// swift-tools-version: 6.0
import PackageDescription

// Swift Package Manager resolves a repository from its root. Keep the actual
// implementation under packages/swift alongside the other language packages.
let package = Package(
    name: "SearchSDK",
    platforms: [.iOS(.v16), .macOS(.v13), .tvOS(.v16), .watchOS(.v9), .visionOS(.v1)],
    products: [.library(name: "SearchSDK", targets: ["SearchSDK"])],
    targets: [
        .target(name: "SearchSDK", path: "packages/swift/Sources/SearchSDK"),
        .testTarget(name: "SearchSDKTests", dependencies: ["SearchSDK"],
                    path: "packages/swift/Tests/SearchSDKTests", resources: [.copy("Fixtures")])
    ],
    swiftLanguageModes: [.v6]
)
