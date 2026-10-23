// swift-tools-version: 6.0
import PackageDescription
import Foundation

let package = Package(
    name: "SearchSDKConsumer",
    platforms: [.macOS(.v13)],
    dependencies: [.package(name: "SearchSDK", path: ProcessInfo.processInfo.environment["SEARCHSDK_PACKAGE_PATH"] ?? "../..")],
    targets: [.executableTarget(name: "SearchSDKConsumer", dependencies: [.product(name: "SearchSDK", package: "SearchSDK")])],
    swiftLanguageModes: [.v6]
)
