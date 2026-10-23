import Foundation

enum GatewayFailure: String, Error {
    case limit = "SEARCHSDK_LIMIT"
    case invalidResponse = "SEARCHSDK_INVALID_RESPONSE"
    case network = "SEARCHSDK_NETWORK"
    case timeout = "SEARCHSDK_TIMEOUT"
    case aborted = "SEARCHSDK_ABORTED"
    case unavailable = "SEARCHSDK_UNAVAILABLE"
}
struct GatewayPayload: Sendable {
    let status: Int
    let headers: [String: String]
    let url: String
    let bytes: Data
}

/// One ephemeral session per transfer. Only the bounded accumulator retains body data.
/// URLSession delivers decoded data; its own individual network chunks are outside this buffer.
final class GatewayTransfer: NSObject, URLSessionDataDelegate, @unchecked Sendable {
    private let lock = NSLock()
    private let maximum: Int
    private var finished = false
    private var completion: (@Sendable (Result<GatewayPayload, GatewayFailure>) -> Void)?
    private var session: URLSession?
    private var task: URLSessionDataTask?
    private var response: HTTPURLResponse?
    private var data = Data()

    init(maxBytes: Int) { maximum = maxBytes }

    static func makeRequest(endpoint: String, headers: [String: String], body: String, timeoutMs: Int) throws -> URLRequest {
        guard let components = URLComponents(string: endpoint), components.scheme?.lowercased() == "https",
              let host = components.host, !host.isEmpty, components.user == nil, components.password == nil,
              components.query == nil, components.fragment == nil, !endpoint.contains("\\"),
              !endpoint.unicodeScalars.contains(where: { $0.value <= 32 || $0.value >= 127 && $0.value <= 159 }),
              let url = components.url, timeoutMs > 0,
              Set(headers.keys).isSubset(of: ["Content-Type", "Accept", "Authorization"]),
              headers["Content-Type"] == "application/json", headers["Accept"] == "application/json" else {
            throw GatewayFailure.invalidResponse
        }
        if let auth = headers["Authorization"], auth.range(of: "^Bearer [A-Za-z0-9\\-._~+/]+=*$", options: .regularExpression) == nil {
            throw GatewayFailure.invalidResponse
        }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData,
                                 timeoutInterval: Double(timeoutMs) / 1000)
        request.httpMethod = "POST"
        request.httpBody = Data(body.utf8)
        request.allHTTPHeaderFields = headers
        request.httpShouldHandleCookies = false
        return request
    }

    func start(_ request: URLRequest, protocolClasses: [AnyClass]? = nil,
               completion: @escaping @Sendable (Result<GatewayPayload, GatewayFailure>) -> Void) {
        lock.lock()
        guard !finished else { lock.unlock(); completion(.failure(.aborted)); return }
        self.completion = completion
        let configuration = URLSessionConfiguration.ephemeral
        configuration.urlCache = nil
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.httpCookieAcceptPolicy = .never
        configuration.urlCredentialStorage = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        configuration.timeoutIntervalForRequest = request.timeoutInterval
        configuration.timeoutIntervalForResource = request.timeoutInterval
        if let protocolClasses { configuration.protocolClasses = protocolClasses }
        let queue = OperationQueue()
        queue.maxConcurrentOperationCount = 1
        let session = URLSession(configuration: configuration, delegate: self, delegateQueue: queue)
        self.session = session
        let task = session.dataTask(with: request)
        self.task = task
        lock.unlock()
        task.resume()
    }
    func cancel() { finish(.failure(.aborted)) }

    private func finish(_ result: Result<GatewayPayload, GatewayFailure>) {
        lock.lock()
        guard !finished else { lock.unlock(); return }
        finished = true
        let completion = self.completion, session = self.session
        self.completion = nil
        self.session = nil
        task = nil
        data = Data()
        lock.unlock()
        session?.invalidateAndCancel()
        completion?(result)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping @Sendable (URLRequest?) -> Void) {
        completionHandler(nil)
        finish(.failure(.invalidResponse))
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping @Sendable (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        // TLS keeps the platform's normal trust evaluation; HTTP authentication has
        // no credential store, UI prompt, or challenge retry.
        completionHandler(challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust ?
                          .performDefaultHandling : .rejectProtectionSpace, nil)
    }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                    completionHandler: @escaping @Sendable (URLSession.ResponseDisposition) -> Void) {
        guard let http = response as? HTTPURLResponse, (100...599).contains(http.statusCode),
              !(300...399).contains(http.statusCode), http.url == dataTask.originalRequest?.url else {
            completionHandler(.cancel); finish(.failure(.invalidResponse)); return
        }
        lock.lock()
        self.response = http
        let finished = self.finished
        lock.unlock()
        completionHandler(finished ? .cancel : .allow)
    }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive chunk: Data) {
        lock.lock()
        guard !finished else { lock.unlock(); return }
        guard maximum > 0, chunk.count <= maximum - data.count else {
            lock.unlock(); finish(.failure(.limit)); return
        }
        data.append(chunk)
        lock.unlock()
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: (any Error)?) {
        if let error {
            finish(.failure((error as NSError).code == NSURLErrorTimedOut ? .timeout : .network)); return
        }
        lock.lock()
        guard !finished, let response else { lock.unlock(); finish(.failure(.invalidResponse)); return }
        let bytes = data
        lock.unlock()
        var headers: [String: String] = [:]
        // Only the protocol header is consumed above the native boundary. Native
        // decoded-byte enforcement makes compressed Content-Length irrelevant.
        if let version = response.value(forHTTPHeaderField: "X-SearchSDK-Protocol") { headers["x-searchsdk-protocol"] = version }
        finish(.success(GatewayPayload(status: response.statusCode, headers: headers,
                                       url: response.url!.absoluteString, bytes: bytes)))
    }
}
