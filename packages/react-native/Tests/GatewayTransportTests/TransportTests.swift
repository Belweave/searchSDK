import Foundation
import XCTest
@testable import GatewayTransport

final class FixtureProtocol: URLProtocol, @unchecked Sendable {
    static var handler: ((FixtureProtocol) -> Void)?
    static var stopped: (() -> Void)?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() { Self.handler?(self) }
    override func stopLoading() { Self.stopped?() }
    func respond(status: Int = 200, headers: [String: String] = [:], chunks: [Data]) {
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: status,
                                httpVersion: "HTTP/1.1", headerFields: headers)!, cacheStoragePolicy: .notAllowed)
        for chunk in chunks { client?.urlProtocol(self, didLoad: chunk) }
        client?.urlProtocolDidFinishLoading(self)
    }
}

final class TransportTests: XCTestCase {
    private let headers = ["Content-Type": "application/json", "Accept": "application/json", "Authorization": "Bearer synthetic-app-token"]
    private func request(timeout: Int = 1000) throws -> URLRequest {
        try GatewayTransfer.makeRequest(endpoint: "https://gateway.invalid/search", headers: headers, body: "{}", timeoutMs: timeout)
    }
    override func tearDown() { FixtureProtocol.handler = nil; FixtureProtocol.stopped = nil; super.tearDown() }

    func testSuccessWithFragmentedDecodedBytesAndNoAmbientCookies() throws {
        let cookie = HTTPCookie(properties: [.domain: "gateway.invalid", .path: "/", .name: "ambient", .value: "private-cookie", .secure: "TRUE"])!
        HTTPCookieStorage.shared.setCookie(cookie)
        defer { HTTPCookieStorage.shared.deleteCookie(cookie) }
        let done = expectation(description: "done")
        let bytes = Data("{\"title\":\"é😀\"}".utf8)
        FixtureProtocol.handler = { fixture in
            XCTAssertNil(fixture.request.value(forHTTPHeaderField: "Cookie"))
            XCTAssertFalse(fixture.request.httpShouldHandleCookies)
            XCTAssertEqual(fixture.request.httpMethod, "POST")
            XCTAssertEqual(fixture.request.value(forHTTPHeaderField: "Authorization"), "Bearer synthetic-app-token")
            fixture.respond(headers: ["X-SearchSDK-Protocol": "1", "Set-Cookie": "hidden=value"], chunks: bytes.map { Data([$0]) })
        }
        let transfer = GatewayTransfer(maxBytes: bytes.count)
        transfer.start(try request(), protocolClasses: [FixtureProtocol.self]) { result in
            guard case .success(let payload) = result else { XCTFail("Expected success"); done.fulfill(); return }
            XCTAssertEqual(payload.bytes, bytes)
            XCTAssertEqual(payload.headers, ["x-searchsdk-protocol": "1"])
            XCTAssertEqual(payload.status, 200)
            done.fulfill()
        }
        wait(for: [done], timeout: 3)
    }
    func testDecodedLimitAcrossChunksWithoutContentLength() throws {
        let done = expectation(description: "limit")
        FixtureProtocol.handler = { $0.respond(chunks: [Data(repeating: 65, count: 8), Data([66])]) }
        let transfer = GatewayTransfer(maxBytes: 8)
        transfer.start(try request(), protocolClasses: [FixtureProtocol.self]) { result in
            guard case .failure(.limit) = result else { XCTFail("Expected limit failure"); done.fulfill(); return }
            done.fulfill()
        }
        wait(for: [done], timeout: 3)
    }
    func testRedirectResponseIsRejectedWithoutFollowing() throws {
        let done = expectation(description: "redirect")
        var calls = 0
        FixtureProtocol.handler = { fixture in
            calls += 1
            fixture.respond(status: 302, headers: ["Location": "https://other.invalid/credential-sink"], chunks: [])
        }
        let transfer = GatewayTransfer(maxBytes: 8)
        transfer.start(try request(), protocolClasses: [FixtureProtocol.self]) { result in
            guard case .failure(.invalidResponse) = result else { XCTFail("Expected redirect rejection"); done.fulfill(); return }
            done.fulfill()
        }
        wait(for: [done], timeout: 3)
        XCTAssertEqual(calls, 1)
    }
    func testRedirectDelegateNeverReturnsNewRequest() throws {
        let transfer = GatewayTransfer(maxBytes: 8)
        let session = URLSession(configuration: .ephemeral)
        defer { session.invalidateAndCancel() }
        let task = session.dataTask(with: try request())
        transfer.urlSession(session, task: task,
            willPerformHTTPRedirection: HTTPURLResponse(url: task.originalRequest!.url!, statusCode: 307, httpVersion: nil, headerFields: nil)!,
            newRequest: URLRequest(url: URL(string: "https://other.invalid/")!)) { next in XCTAssertNil(next) }
        task.cancel()
    }
    func testAbortCancelsHangingNativeWorkExactlyOnce() throws {
        let started = expectation(description: "started"), stopped = expectation(description: "stopped"), done = expectation(description: "done")
        done.assertForOverFulfill = true
        FixtureProtocol.handler = { _ in started.fulfill() }
        FixtureProtocol.stopped = { stopped.fulfill() }
        let transfer = GatewayTransfer(maxBytes: 8)
        transfer.start(try request(), protocolClasses: [FixtureProtocol.self]) { result in
            guard case .failure(.aborted) = result else { XCTFail("Expected abort"); done.fulfill(); return }
            done.fulfill()
        }
        wait(for: [started], timeout: 3)
        transfer.cancel(); transfer.cancel()
        wait(for: [done, stopped], timeout: 3)
    }
    func testCancelBeforeStartNeverDispatches() throws {
        let transfer = GatewayTransfer(maxBytes: 8), done = expectation(description: "aborted")
        FixtureProtocol.handler = { _ in XCTFail("Cancelled request dispatched") }
        transfer.cancel()
        transfer.start(try request(), protocolClasses: [FixtureProtocol.self]) { result in
            guard case .failure(.aborted) = result else { XCTFail("Expected abort"); done.fulfill(); return }
            done.fulfill()
        }
        wait(for: [done], timeout: 1)
    }
    func testResourceDeadlineStopsSignalIgnoringProtocol() throws {
        let done = expectation(description: "timeout")
        FixtureProtocol.handler = { _ in }
        let transfer = GatewayTransfer(maxBytes: 8)
        transfer.start(try request(timeout: 20), protocolClasses: [FixtureProtocol.self]) { result in
            guard case .failure(.timeout) = result else { XCTFail("Expected deadline"); done.fulfill(); return }
            done.fulfill()
        }
        wait(for: [done], timeout: 3)
    }
    func testHTTPFailureBodyAndStatusRemainAvailableToProtocolLayer() throws {
        let done = expectation(description: "http failure")
        FixtureProtocol.handler = { $0.respond(status: 401, chunks: [Data("{}".utf8)]) }
        let transfer = GatewayTransfer(maxBytes: 8)
        transfer.start(try request(), protocolClasses: [FixtureProtocol.self]) { result in
            guard case .success(let payload) = result else { XCTFail("Expected HTTP payload"); done.fulfill(); return }
            XCTAssertEqual(payload.status, 401); XCTAssertEqual(payload.bytes, Data("{}".utf8)); done.fulfill()
        }
        wait(for: [done], timeout: 3)
    }
    func testNativeEntryRejectsCredentialURLsAndHeaderInjection() {
        for endpoint in ["http://example.com/", "https://u:p@example.com", "https://example.com/?q=secret", "https://example.com/#", "https://example.com/\\path"] {
            XCTAssertThrowsError(try GatewayTransfer.makeRequest(endpoint: endpoint, headers: headers, body: "{}", timeoutMs: 1000))
        }
        for key in ["Cookie", "Proxy-Authorization"] {
            var injected = headers; injected[key] = "secret"
            XCTAssertThrowsError(try GatewayTransfer.makeRequest(endpoint: "https://example.com/", headers: injected, body: "{}", timeoutMs: 1000))
        }
        var injected = headers; injected["Authorization"] = "Bearer bad\r\nX: secret"
        XCTAssertThrowsError(try GatewayTransfer.makeRequest(endpoint: "https://example.com/", headers: injected, body: "{}", timeoutMs: 1000))
    }
}
