import Foundation
import Testing
@testable import SearchSDK

private actor BatchTransport: GatewayTransport {
    let data: Data
    var calls: [String] = []
    var active = 0
    var peak = 0
    init(data: Data) { self.data = data }
    func execute(_ request: URLRequest, maxResponseBytes: Int) async throws -> GatewayHTTPResponse {
        let input = try JSONDecoder().decode(SearchRequest.self, from: request.httpBody!)
        calls.append(input.query)
        active += 1; peak = max(peak, active)
        defer { active -= 1 }
        try await Task.sleep(for: .milliseconds(input.query == "slow" ? 80 : input.query == "blocked" ? 1000 : 5))
        if input.query == "failure" {
            return GatewayHTTPResponse(status: 401, body: Data())
        }
        return GatewayHTTPResponse(status: 200, body: data)
    }
}

struct ConcurrencyTests {
    let endpoint = "https://gateway.example.test"
    func errorCode(_ result: SearchBatchResult) -> SearchErrorCode? {
        if case .failure(let error) = result.result { return error.code }
        return nil
    }
    func checkError(_ expected: SearchErrorCode, _ task: Task<SearchResponse, any Error>) async {
        do { _ = try await task.value; Issue.record("Expected failure") }
        catch let error as SearchError { #expect(error.code == expected) }
        catch { Issue.record("Unsanitized error") }
    }
    @Test func orderedBatchPreservesSiblingsAndBoundsDispatch() async throws {
        let transport = BatchTransport(data: try fixture())
        let client = try SearchClient(endpoint: endpoint, maxConcurrency: 2, transport: transport)
        let inputs = try ["slow", "fast", "failure", "last"].map { try SearchRequest(query: $0) }
        let result = try await client.searchBatch(inputs, concurrency: 3)
        #expect(result.map(\.index) == [0, 1, 2, 3])
        #expect(errorCode(result[0]) == nil)
        #expect(errorCode(result[1]) == nil)
        #expect(errorCode(result[2]) == .auth)
        #expect(errorCode(result[3]) == nil)
        #expect(await transport.peak == 2)
        #expect(await transport.calls.count == 4)
    }
    @Test func batchDeadlineIncludesQueueAndKeepsCompletedValues() async throws {
        let transport = BatchTransport(data: try fixture())
        let client = try SearchClient(endpoint: endpoint, transport: transport)
        let result = try await client.searchBatch(["fast", "blocked", "queued"].map { try SearchRequest(query: $0) }, concurrency: 1, timeout: 0.1)
        #expect(errorCode(result[0]) == nil)
        #expect(errorCode(result[1]) == .timeout)
        #expect(errorCode(result[2]) == .timeout)
        #expect(await transport.calls == ["fast", "blocked"])
    }
    @Test func cancellationStopsActiveAndQueuedBatchItems() async throws {
        let transport = BatchTransport(data: try fixture())
        let client = try SearchClient(endpoint: endpoint, transport: transport)
        let requests = try (0..<10).map { _ in try SearchRequest(query: "blocked") }
        let batch = Task { try await client.searchBatch(requests, concurrency: 2) }
        for _ in 0..<100 {
            if await transport.calls.count == 2 { break }
            try await Task.sleep(for: .milliseconds(2))
        }
        #expect(await transport.calls.count == 2)
        batch.cancel()
        let result = try await batch.value
        #expect(result.count == 10)
        #expect(result.allSatisfy { errorCode($0) == .aborted })
        #expect(await transport.calls.count == 2)
    }
    @Test func preCancelledSearchAndBatchDoNotDispatchOrResolveTokens() async throws {
        let calls = Counter()
        let transport = BatchTransport(data: try fixture())
        let client = try SearchClient(endpoint: endpoint, transport: transport, applicationToken: { _ = await calls.increment(); return nil })
        let request = try SearchRequest(query: "x")
        let task = Task {
            withUnsafeCurrentTask { $0?.cancel() }
            return try await client.search(request)
        }
        await checkError(.aborted, task)
        let batch = Task {
            withUnsafeCurrentTask { $0?.cancel() }
            return try await client.searchBatch([request, request])
        }
        #expect(try await batch.value.allSatisfy { errorCode($0) == .aborted })
        #expect(await transport.calls.isEmpty)
        #expect(await calls.value == 0)
    }
    @Test func queuedSearchCancellationReleasesNoExtraPermit() async throws {
        let transport = BatchTransport(data: try fixture())
        let client = try SearchClient(endpoint: endpoint, maxConcurrency: 1, transport: transport)
        let first = Task { try await client.search(SearchRequest(query: "slow")) }
        for _ in 0..<100 {
            if await transport.calls.count == 1 { break }
            try await Task.sleep(for: .milliseconds(1))
        }
        let queued = Task { try await client.search(SearchRequest(query: "cancelled")) }
        try await Task.sleep(for: .milliseconds(5))
        queued.cancel()
        await checkError(.aborted, queued)
        _ = try await first.value
        _ = try await client.search(SearchRequest(query: "after"))
        #expect(await transport.calls == ["slow", "after"])
        #expect(await transport.peak == 1)
    }
    @Test func sharedClientBoundsConcurrentBatchesAndSearches() async throws {
        let transport = BatchTransport(data: try fixture())
        let client = try SearchClient(endpoint: endpoint, maxConcurrency: 2, transport: transport)
        let requests = try (0..<10).map { _ in try SearchRequest(query: "fast") }
        async let first = client.searchBatch(requests, concurrency: 8)
        async let second = client.searchBatch(requests, concurrency: 8)
        async let third = client.search(SearchRequest(query: "fast"))
        _ = try await (first, second, third)
        #expect(await transport.peak == 2)
        #expect(await transport.calls.count == 21)
    }
    @Test func clientDeadlineIncludesPermitWait() async throws {
        let transport = BatchTransport(data: try fixture())
        let client = try SearchClient(endpoint: endpoint, timeout: 0.04, maxConcurrency: 1, transport: transport)
        let outcomes = try await client.searchBatch(["blocked", "blocked"].map { try SearchRequest(query: $0) }, concurrency: 2)
        #expect(outcomes.allSatisfy { errorCode($0) == .timeout })
        #expect(await transport.calls == ["blocked"])
    }
    @Test func batchValidatesEnvelopeAndEmptyInput() async throws {
        let transport = BatchTransport(data: try fixture())
        let client = try SearchClient(endpoint: endpoint, transport: transport)
        let input = try SearchRequest(query: "x")
        #expect(try await client.searchBatch([]).isEmpty)
        for n in [0, 65] {
            do { _ = try await client.searchBatch([input], concurrency: n); Issue.record("Expected validation failure") }
            catch let error as SearchError { #expect(error.code == .invalidRequest) }
        }
        for timeout in [0.0, .nan, .infinity, -1] {
            do { _ = try await client.searchBatch([input], timeout: timeout); Issue.record("Expected validation failure") }
            catch let error as SearchError { #expect(error.code == .invalidRequest) }
        }
        do { _ = try await client.searchBatch(Array(repeating: input, count: 1001)); Issue.record("Expected validation failure") }
        catch let error as SearchError { #expect(error.code == .invalidRequest) }
        #expect(await transport.calls.isEmpty)
    }

    // The continuation intentionally ignores cancellation for a bounded 150 ms to model an application callback.
    private func uncooperativePause() async {
        await withCheckedContinuation { continuation in
            DispatchQueue.global().asyncAfter(deadline: .now() + 0.15) { continuation.resume() }
        }
    }
    @Test func tokenDeadlineReturnsPromptlyAndPreventsLateDispatch() async throws {
        let transport = BatchTransport(data: try fixture())
        let tokens = Counter()
        let client = try SearchClient(endpoint: endpoint, timeout: 0.03, maxConcurrency: 1, transport: transport, applicationToken: {
            if await tokens.increment() == 1 { await uncooperativePause() }
            return "short-lived-app-token"
        })
        let start = ContinuousClock.now
        await checkError(.timeout, Task { try await client.search(SearchRequest(query: "blocked")) })
        #expect(start.duration(to: .now) < .milliseconds(130))
        _ = try await client.search(SearchRequest(query: "after"))
        try await Task.sleep(for: .milliseconds(160))
        #expect(await transport.calls == ["after"])
    }
    @Test func tokenCancellationReturnsPromptlyAndPreventsLateDispatch() async throws {
        let transport = BatchTransport(data: try fixture())
        let tokens = Counter()
        let client = try SearchClient(endpoint: endpoint, transport: transport, applicationToken: {
            _ = await tokens.increment()
            await uncooperativePause()
            return "short-lived-app-token"
        })
        let task = Task { try await client.search(SearchRequest(query: "x")) }
        for _ in 0..<100 {
            if await tokens.value > 0 { break }
            try await Task.sleep(for: .milliseconds(1))
        }
        task.cancel()
        await checkError(.aborted, task)
        try await Task.sleep(for: .milliseconds(170))
        #expect(await transport.calls.isEmpty)
    }

    private func synchronousParsingWork() -> Int {
        Thread.sleep(forTimeInterval: 0.15)
        return 1
    }
    @Test func deadlineCoversSynchronousWorkAndRejectsLateCompletion() async throws {
        let start = ContinuousClock.now
        do {
            _ = try await Deadline.run(until: .now.advanced(by: .milliseconds(25))) { synchronousParsingWork() }
            Issue.record("Expected timeout")
        } catch let error as SearchError { #expect(error.code == .timeout) }
        #expect(start.duration(to: .now) < .milliseconds(130))
        try await Task.sleep(for: .milliseconds(170))
    }
}
