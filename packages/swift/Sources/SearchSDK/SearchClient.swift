import Foundation

/// Gateway protocol v1 client. Backend provider selection, retries and fallback belong to the application server.
public final class SearchClient: Sendable {
    public typealias ApplicationToken = @Sendable () async throws -> String?
    private let endpoint: URL
    private let token: ApplicationToken
    private let transport: any GatewayTransport
    private let timeout: TimeInterval
    private let maxResponseBytes: Int
    private let permits: PermitPool

    public init(endpoint: String, timeout: TimeInterval = 10, maxResponseBytes: Int = 10 * 1024 * 1024,
                maxConcurrency: Int = 4, transport: any GatewayTransport = URLSessionGatewayTransport(),
                applicationToken: @escaping ApplicationToken = { nil }) throws {
        guard let url = Validation.safeURL(endpoint, endpoint: true), Validation.timeout(timeout),
              maxResponseBytes > 0, maxResponseBytes <= 100 * 1024 * 1024, (1...64).contains(maxConcurrency) else {
            throw SearchError(.configuration)
        }
        self.endpoint = url
        self.timeout = timeout
        self.maxResponseBytes = maxResponseBytes
        self.permits = PermitPool(maxConcurrency)
        self.transport = transport
        self.token = applicationToken
    }

    public func search(_ request: SearchRequest) async throws -> SearchResponse {
        try await search(request, deadline: ContinuousClock.now.advanced(by: .seconds(timeout)))
    }

    /// At most 1,000 items, with 1–64 workers. Each outcome keeps its input index.
    /// The batch deadline includes queued items and defaults to the client's timeout.
    public func searchBatch(_ requests: [SearchRequest], concurrency: Int = 4,
                            timeout: TimeInterval? = nil) async throws -> [SearchBatchResult] {
        let budget = timeout ?? self.timeout
        guard requests.count <= 1000, (1...64).contains(concurrency), Validation.timeout(budget) else {
            throw SearchError(.invalidRequest)
        }
        let deadline = ContinuousClock.now.advanced(by: .seconds(budget))
        return await withTaskGroup(of: SearchBatchResult.self) { group in
            var outcomes = [SearchBatchResult?](repeating: nil, count: requests.count)
            var next = 0
            func add(_ index: Int) {
                group.addTask {
                    do {
                        let value = try await self.search(requests[index], deadline: min(deadline, .now.advanced(by: .seconds(self.timeout))))
                        return SearchBatchResult(index: index, result: .success(value))
                    } catch {
                        return SearchBatchResult(index: index, result: .failure(Self.sanitized(error)))
                    }
                }
            }
            for _ in 0..<min(concurrency, requests.count) { add(next); next += 1 }
            for await outcome in group {
                outcomes[outcome.index] = outcome
                if next < requests.count { add(next); next += 1 }
            }
            return outcomes.compactMap { $0 }
        }
    }

    private func search(_ request: SearchRequest, deadline: ContinuousClock.Instant) async throws -> SearchResponse {
        do {
            return try await Deadline.run(until: deadline) {
                let permit = try await self.permits.acquire()
                return try await withTaskCancellationHandler {
                    do {
                        try Task.checkCancellation()
                        let value = try await self.perform(request, deadline: deadline)
                        await self.permits.release(permit)
                        return value
                    } catch {
                        await self.permits.release(permit)
                        throw error
                    }
                } onCancel: { Task { await self.permits.release(permit) } }
            }
        } catch { throw Self.sanitized(error) }
    }

    private func perform(_ request: SearchRequest, deadline: ContinuousClock.Instant) async throws -> SearchResponse {
        var http = URLRequest(url: endpoint, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData)
        http.httpMethod = "POST"
        http.httpShouldHandleCookies = false
        http.setValue("application/json", forHTTPHeaderField: "Content-Type")
        http.setValue("application/json", forHTTPHeaderField: "Accept")
        http.httpBody = try JSONEncoder().encode(request)
        try Task.checkCancellation()
        guard ContinuousClock.now < deadline else { throw SearchError(.timeout) }
        let accessToken: String?
        do { accessToken = try await token() }
        catch is CancellationError { throw SearchError(.aborted) }
        catch { throw SearchError(.auth) }
        try Task.checkCancellation()
        guard ContinuousClock.now < deadline else { throw SearchError(.timeout) }
        if let accessToken {
            guard Validation.matches(accessToken, "\\A[A-Za-z0-9._~+/-]+=*\\z") else { throw SearchError(.auth) }
            http.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        let remaining = ContinuousClock.now.duration(to: deadline).components
        http.timeoutInterval = max(0.001, Double(remaining.seconds) + Double(remaining.attoseconds) / 1e18)
        let response = try await transport.execute(http, maxResponseBytes: maxResponseBytes)
        try Task.checkCancellation()
        guard response.body.count <= maxResponseBytes, (100...599).contains(response.status) else { throw SearchError(.invalidResponse) }
        let versions = response.headers.filter { $0.key.lowercased() == "x-searchsdk-protocol" }.map(\.value)
        guard versions.allSatisfy({ $0 == "1" }) else { throw SearchError(.invalidResponse) }
        if response.status == 200 {
            do {
                let value = try JSONDecoder().decode(SearchResponse.self, from: response.body)
                guard value.results.count <= request.limit else { throw SearchError(.invalidResponse) }
                return value
            } catch { throw SearchError(.invalidResponse) }
        }
        if (200...299).contains(response.status) { throw SearchError(.invalidResponse) }
        throw Self.gatewayError(response)
    }

    private struct FailureEnvelope: Decodable {
        struct Failure: Decodable {
            let code: SearchErrorCode
            let attempts: [SearchAttempt]
            let status: Int?
            let retryAfterMs: Double?
            private enum CodingKeys: String, CodingKey { case code, attempts, status, retryAfterMs }
            init(from decoder: any Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                code = try c.decode(SearchErrorCode.self, forKey: .code)
                attempts = try c.decode([SearchAttempt].self, forKey: .attempts)
                status = try c.decodeOmitted(Int.self, forKey: .status)
                retryAfterMs = try c.decodeOmitted(Double.self, forKey: .retryAfterMs)
            }
        }
        let error: Failure
    }
    private static func gatewayError(_ response: GatewayHTTPResponse) -> SearchError {
        if let envelope = try? JSONDecoder().decode(FailureEnvelope.self, from: response.body),
           (try? Validation.attempts(envelope.error.attempts)) != nil,
           Validation.status(envelope.error.status), Validation.nonnegative(envelope.error.retryAfterMs) {
            return SearchError(envelope.error.code, attempts: envelope.error.attempts,
                               status: envelope.error.status, retryAfterMs: envelope.error.retryAfterMs)
        }
        let code: SearchErrorCode
        switch response.status {
        case 401, 402, 403, 432, 433: code = .auth
        case 429: code = .rateLimit
        case 408, 500...599: code = .unavailable
        default: code = .providerError
        }
        return SearchError(code, status: response.status)
    }
    private static func sanitized(_ error: any Error) -> SearchError {
        if let error = error as? SearchError { return error }
        if error is CancellationError { return SearchError(.aborted) }
        if let error = error as? URLError {
            if error.code == .cancelled { return SearchError(.aborted) }
            if error.code == .timedOut { return SearchError(.timeout) }
        }
        return SearchError(.network)
    }
}
