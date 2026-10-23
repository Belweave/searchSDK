// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SearchSDK",
    platforms: [.iOS(.v16), .macOS(.v13), .tvOS(.v16), .watchOS(.v9), .visionOS(.v1)],
    products: [.library(name: "SearchSDK", targets: ["SearchSDK"])],
    targets: [
        .target(name: "SearchSDK"),
        .testTarget(name: "SearchSDKTests", dependencies: ["SearchSDK"], resources: [.copy("Fixtures")])
    ],
    swiftLanguageModes: [.v6]
)
