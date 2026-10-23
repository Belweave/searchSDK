// swift-tools-version: 6.0
import PackageDescription
// Transport-only deterministic verification. CocoaPods builds the React bridge in applications.
let package = Package(name: "SearchSDKReactNativeTransport", platforms: [.macOS(.v13), .iOS(.v15)],
    targets: [
        .target(name: "GatewayTransport", path: "ios", exclude: ["SearchSDKGateway.swift", "SearchSDKGateway.m"]),
        .testTarget(name: "GatewayTransportTests", dependencies: ["GatewayTransport"], path: "Tests/GatewayTransportTests")
    ], swiftLanguageModes: [.v5])
