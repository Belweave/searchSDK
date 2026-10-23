import Foundation
import SearchSDK

func fixture() throws -> Data {
    let url = Bundle.module.url(forResource: "success", withExtension: "json", subdirectory: "Fixtures")!
    return try Data(contentsOf: url)
}

struct StubTransport: GatewayTransport {
    let action: @Sendable (URLRequest, Int) async throws -> GatewayHTTPResponse
    init(_ action: @escaping @Sendable (URLRequest, Int) async throws -> GatewayHTTPResponse) { self.action = action }
    func execute(_ request: URLRequest, maxResponseBytes: Int) async throws -> GatewayHTTPResponse {
        try await action(request, maxResponseBytes)
    }
}

actor Counter {
    var value = 0
    func increment() -> Int { value += 1; return value }
}

/// Thread-safe deterministic URLProtocol fixture. No socket or provider is contacted.
final class FixtureProtocol: URLProtocol, @unchecked Sendable {
    struct Plan: Sendable {
        var status = 200
        var headers = ["X-SearchSDK-Protocol": "1"]
        var chunks: [Data] = []
        var delay: Duration = .zero
        var error: URLError?
        var redirect: URL?
    }
    final class Registry: @unchecked Sendable {
        let lock = NSLock()
        var handler: (@Sendable (URLRequest) -> Plan)?
        var calls: [URLRequest] = []
        var stops = 0
        func configure(_ handler: @escaping @Sendable (URLRequest) -> Plan) {
            lock.lock(); defer { lock.unlock() }
            self.handler = handler; calls = []; stops = 0
        }
        func plan(_ request: URLRequest) -> Plan {
            lock.lock(); defer { lock.unlock() }
            calls.append(request)
            return handler!(request)
        }
        func stopped() { lock.lock(); stops += 1; lock.unlock() }
        func snapshot() -> ([URLRequest], Int) { lock.lock(); defer { lock.unlock() }; return (calls, stops) }
    }
    static let registry = Registry()
    private let lock = NSLock()
    private var loading: Task<Void, Never>?
    private var stopped = false

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        let plan = Self.registry.plan(request)
        lock.lock()
        guard !stopped else { lock.unlock(); return }
        loading = Task {
            do {
                try await Task.sleep(for: plan.delay)
                try Task.checkCancellation()
                if let error = plan.error { client?.urlProtocol(self, didFailWithError: error); return }
                let response = HTTPURLResponse(url: request.url!, statusCode: plan.status, httpVersion: "HTTP/1.1", headerFields: plan.headers)!
                if let redirect = plan.redirect {
                    client?.urlProtocol(self, wasRedirectedTo: URLRequest(url: redirect), redirectResponse: response)
                    return
                }
                client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                for chunk in plan.chunks {
                    try Task.checkCancellation()
                    client?.urlProtocol(self, didLoad: chunk)
                    await Task.yield()
                }
                try Task.checkCancellation()
                client?.urlProtocolDidFinishLoading(self)
            } catch { /* The SDK cancelled this fixture request. */ }
        }
        lock.unlock()
    }
    override func stopLoading() {
        lock.lock(); stopped = true; let loading = self.loading; self.loading = nil; lock.unlock()
        loading?.cancel()
        Self.registry.stopped()
    }
}
