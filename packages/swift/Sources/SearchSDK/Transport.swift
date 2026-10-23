import Foundation

/// Injection boundary for deterministic tests. Implementations must honor task cancellation,
/// reject redirects, and enforce maxResponseBytes while receiving decoded bytes.
public protocol GatewayTransport: Sendable {
    func execute(_ request: URLRequest, maxResponseBytes: Int) async throws -> GatewayHTTPResponse
}

public struct GatewayHTTPResponse: Sendable {
    public let status: Int
    public let headers: [String: String]
    public let body: Data
    public init(status: Int, headers: [String: String] = [:], body: Data) {
        self.status = status
        self.headers = headers
        self.body = body
    }
}

/// Ephemeral URLSession transport. No cookie jar, URL cache, credential store, or redirect following.
public struct URLSessionGatewayTransport: GatewayTransport {
    private let protocolClasses: [AnyClass]?
    /// protocolClasses is for URLProtocol fixtures; production callers should use the default.
    public init(protocolClasses: [AnyClass]? = nil) { self.protocolClasses = protocolClasses }

    public func execute(_ request: URLRequest, maxResponseBytes: Int) async throws -> GatewayHTTPResponse {
        let transfer = Transfer(maxBytes: maxResponseBytes)
        return try await withTaskCancellationHandler {
            try Task.checkCancellation()
            return try await withCheckedThrowingContinuation { continuation in
                transfer.start(request, protocolClasses: protocolClasses, continuation: continuation)
            }
        } onCancel: { transfer.finish(.failure(CancellationError())) }
    }
}

/// URLSession delivers decoded chunks. The accumulator never grows past the configured byte ceiling.
/// URLSession may allocate a single incoming chunk independently of this buffer.
private final class Transfer: NSObject, URLSessionDataDelegate, @unchecked Sendable {
    private let lock = NSLock()
    private let maxBytes: Int
    private var completed = false
    private var continuation: CheckedContinuation<GatewayHTTPResponse, any Error>?
    private var session: URLSession?
    private var task: URLSessionDataTask?
    private var response: HTTPURLResponse?
    private var data = Data()

    init(maxBytes: Int) { self.maxBytes = maxBytes }

    func start(_ request: URLRequest, protocolClasses: [AnyClass]?,
               continuation: CheckedContinuation<GatewayHTTPResponse, any Error>) {
        lock.lock()
        guard !completed else { lock.unlock(); continuation.resume(throwing: CancellationError()); return }
        self.continuation = continuation
        let configuration = URLSessionConfiguration.ephemeral
        configuration.urlCache = nil
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCredentialStorage = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        configuration.protocolClasses = protocolClasses
        let queue = OperationQueue()
        queue.maxConcurrentOperationCount = 1
        let session = URLSession(configuration: configuration, delegate: self, delegateQueue: queue)
        self.session = session
        let task = session.dataTask(with: request)
        self.task = task
        lock.unlock()
        task.resume()
    }

    func finish(_ result: Result<GatewayHTTPResponse, any Error>) {
        lock.lock()
        guard !completed else { lock.unlock(); return }
        completed = true
        let continuation = self.continuation
        self.continuation = nil
        let session = self.session
        self.session = nil
        task = nil
        data = Data()
        lock.unlock()
        session?.invalidateAndCancel()
        continuation?.resume(with: result)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
                    completionHandler: @escaping @Sendable (URLRequest?) -> Void) {
        completionHandler(nil)
        finish(.failure(SearchError(.providerError, status: response.statusCode)))
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                    completionHandler: @escaping @Sendable (URLSession.ResponseDisposition) -> Void) {
        guard let http = response as? HTTPURLResponse else {
            completionHandler(.cancel); finish(.failure(SearchError(.invalidResponse))); return
        }
        lock.lock()
        self.response = http
        let completed = self.completed
        lock.unlock()
        completionHandler(completed ? .cancel : .allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive chunk: Data) {
        lock.lock()
        guard !completed else { lock.unlock(); return }
        guard chunk.count <= maxBytes - data.count else {
            lock.unlock(); finish(.failure(SearchError(.invalidResponse))); return
        }
        data.append(chunk)
        lock.unlock()
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: (any Error)?) {
        if let error { finish(.failure(error)); return }
        lock.lock()
        guard !completed, let response else { lock.unlock(); finish(.failure(SearchError(.invalidResponse))); return }
        let body = data
        lock.unlock()
        var headers: [String: String] = [:]
        for (key, value) in response.allHeaderFields {
            if let key = key as? String, let value = value as? String { headers[key.lowercased()] = value }
        }
        finish(.success(GatewayHTTPResponse(status: response.statusCode, headers: headers, body: body)))
    }
}
