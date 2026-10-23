import Foundation
import Testing
@testable import SearchSDK

@Suite(.serialized)
struct SearchSDKTests {
    let endpoint = "https://gateway.example.test/exact/path"
    func request(_ query: String = "synthetic query") throws -> SearchRequest { try SearchRequest(query: query) }
    func response(_ data: Data, status: Int = 200, headers: [String: String] = [:]) -> StubTransport {
        StubTransport { _, _ in GatewayHTTPResponse(status: status, headers: headers, body: data) }
    }
    func assertError(_ expected: SearchErrorCode, _ operation: () async throws -> Void) async {
        do { try await operation(); Issue.record("Expected \(expected)") }
        catch let error as SearchError { #expect(error.code == expected) }
        catch { Issue.record("Unsanitized error type: \(type(of: error))") }
    }

    @Test func requestValidationAndNormalization() throws {
        let value = try SearchRequest(query: "  keep original query  ", includeDomains: ["EXAMPLE.com", "example.com", "docs.example.com"], excludeDomains: ["other.test"])
        #expect(value.query == "  keep original query  ")
        #expect(value.limit == 5)
        #expect(value.includeDomains == ["example.com", "docs.example.com"])
        for query in ["", " \n\t", "\u{00a0}", "\u{feff}"] { #expect(throws: SearchError.self) { try SearchRequest(query: query) } }
        #expect(try SearchRequest(query: "\u{0085}").query == "\u{0085}")
        for limit in [0, 21, -1] { #expect(throws: SearchError.self) { try SearchRequest(query: "x", limit: limit) } }
        for domain in ["localhost", "*.example.com", "https://example.com", "example.com:443", "example.com/", "-x.example", "x_.example", "é.example", "x..test", "x.test.", String(repeating: "a", count: 64) + ".test"] {
            #expect(throws: SearchError.self) { try SearchRequest(query: "x", includeDomains: [domain]) }
        }
        #expect(throws: SearchError.self) { try SearchRequest(query: "x", includeDomains: []) }
        #expect(throws: SearchError.self) { try SearchRequest(query: "x", includeDomains: ["EXAMPLE.com"], excludeDomains: ["example.com"]) }
    }

    @Test func requestDecodingRejectsUnknownFieldsAndNull() throws {
        for json in ["{}", "[]", "null", "{\"query\":\"x\",\"native\":true}", "{\"query\":\"x\",\"limit\":null}", "{\"query\":\"x\",\"limit\":1.5}", "{\"query\":\"x\",\"limit\":true}", "{\"query\":\"x\",\"includeDomains\":null}"] {
            #expect(throws: SearchError.self) { try JSONDecoder().decode(SearchRequest.self, from: Data(json.utf8)) }
        }
        let value = try JSONDecoder().decode(SearchRequest.self, from: Data(#"{"query":"x"}"#.utf8))
        #expect(value.limit == 5)
    }

    @Test func configurationRejectsUnsafeEndpointsAndBounds() throws {
        for url in ["http://gateway.test", "https://user:password@gateway.test", "https://@gateway.test", "https://gateway.test?", "https://gateway.test#", "https://gateway.test/?key=secret", "https://gateway.test/\n", "https://gateway.test\\path", "file:///tmp/gateway", "https:///", "https://gateway.test:0", "https://gateway.test:65536"] {
            #expect(throws: SearchError.self) { try SearchClient(endpoint: url) }
        }
        for timeout in [0.0, -1, .infinity, .nan, 86401] { #expect(throws: SearchError.self) { try SearchClient(endpoint: endpoint, timeout: timeout) } }
        for limit in [0, -1, 104857601] { #expect(throws: SearchError.self) { try SearchClient(endpoint: endpoint, maxResponseBytes: limit) } }
        for concurrency in [0, 65] { #expect(throws: SearchError.self) { try SearchClient(endpoint: endpoint, maxConcurrency: concurrency) } }
        _ = try SearchClient(endpoint: "HTTPS://gateway.test")
    }

    @Test func exactPOSTAndFreshApplicationTokens() async throws {
        let tokens = Counter()
        let data = try fixture()
        let transport = StubTransport { http, ceiling in
            #expect(http.url?.absoluteString == endpoint)
            #expect(http.httpMethod == "POST")
            #expect(http.value(forHTTPHeaderField: "Content-Type") == "application/json")
            #expect(http.value(forHTTPHeaderField: "Accept") == "application/json")
            #expect(http.httpShouldHandleCookies == false)
            #expect(http.value(forHTTPHeaderField: "Authorization")?.hasPrefix("Bearer app-token-") == true)
            #expect(ceiling == 10 * 1024 * 1024)
            let value = try JSONDecoder().decode(SearchRequest.self, from: http.httpBody!)
            #expect(value.query == "synthetic query")
            return GatewayHTTPResponse(status: 200, headers: ["X-SearchSDK-Protocol": "1"], body: data)
        }
        let client = try SearchClient(endpoint: endpoint, transport: transport, applicationToken: { "app-token-\(await tokens.increment())" })
        let first = try await client.search(request())
        let second = try await client.search(request())
        #expect(first == second)
        #expect(first.results.first?.provenance.requestId == "synthetic-1")
        #expect(first.usage == nil)
        #expect(await tokens.value == 2)
        let roundTrip = try JSONDecoder().decode(SearchResponse.self, from: JSONEncoder().encode(first))
        #expect(roundTrip == first)
    }

    @Test func malformedSuccessFields() async throws {
        let original = try JSONSerialization.jsonObject(with: fixture()) as! [String: Any]
        var variants: [[String: Any]] = []
        for field in ["provider", "results", "usage", "warnings", "attempts"] { var v = original; v.removeValue(forKey: field); variants.append(v) }
        for (field, value) in [("provider", "invalid provider" as Any), ("results", NSNull()), ("usage", ["unit": "tokens", "value": 2]), ("usage", ["unit": "usd", "value": -1]), ("warnings", [["code": "raw-secret", "provider": "fixture"]]), ("attempts", [["provider": "fixture", "startedAt": "bad", "durationMs": 1, "outcome": "success"]]), ("reuse", "unexpected"), ("reuse", NSNull())] {
            var v = original; v[field] = value; variants.append(v)
        }
        let result = (original["results"] as! [[String: Any]])[0]
        for (field, value) in [("url", "javascript:secret()" as Any), ("url", "https://user:secret@example.com/"), ("url", "https://example.com/white space"), ("url", "https://example.com\\evil"), ("score", "NaN"), ("score", 1e100), ("highlights", [1]), ("provenance", NSNull())] {
            var row = result; row[field] = value
            if field == "score", value is Double { continue } // Finite large scores are valid.
            var v = original; v["results"] = [row]; variants.append(v)
        }
        let provenance = result["provenance"] as! [String: Any]
        for (field, value) in [("provider", "private text"), ("sourceUrl", "ftp://example.com"), ("retrievedAt", "yesterday"), ("requestId", "unsafe\nidentifier")] {
            var p = provenance; p[field] = value
            var row = result; row["provenance"] = p
            var v = original; v["results"] = [row]; variants.append(v)
        }
        for (field, value) in [("status", NSNull() as Any), ("status", 999), ("retryAfterMs", NSNull()), ("retryAfterMs", -1), ("code", NSNull()), ("code", "secret"), ("outcome", "other"), ("startedAt", "2026-10-22T00:00:00Zjunk"), ("startedAt", "2026-02-31T00:00:00Z")] {
            var attempt = (original["attempts"] as! [[String: Any]])[0]; attempt[field] = value
            var v = original; v["attempts"] = [attempt]; variants.append(v)
        }
        var excessive = original
        excessive["attempts"] = Array(repeating: (original["attempts"] as! [Any])[0], count: 1025)
        variants.append(excessive)
        for duration in [-1.0] {
            var attempt = (original["attempts"] as! [[String: Any]])[0]; attempt["durationMs"] = duration
            var v = original; v["attempts"] = [attempt]; variants.append(v)
        }
        for variant in variants {
            let data = try JSONSerialization.data(withJSONObject: variant)
            let client = try SearchClient(endpoint: endpoint, transport: response(data))
            await assertError(.invalidResponse) { _ = try await client.search(request()) }
        }
        for data in [Data(), Data("private-invalid-json".utf8), Data("null".utf8), Data("[]".utf8), Data("{} trailing".utf8), Data([0xff, 0xfe])] {
            let client = try SearchClient(endpoint: endpoint, transport: response(data))
            await assertError(.invalidResponse) { _ = try await client.search(request()) }
        }
        let overflow = String(data: try fixture(), encoding: .utf8)!.replacingOccurrences(of: "0.75", with: "1e999")
        let client = try SearchClient(endpoint: endpoint, transport: response(Data(overflow.utf8)))
        await assertError(.invalidResponse) { _ = try await client.search(request()) }
    }

    @Test func protocolsAndUnexpectedSuccessfulStatuses() async throws {
        for version in ["0", "2", "1, 2", "", " 1"] {
            let client = try SearchClient(endpoint: endpoint, transport: response(fixture(), headers: ["x-SeArChSdK-PrOtOcOl": version]))
            await assertError(.invalidResponse) { _ = try await client.search(request()) }
        }
        for status in [201, 204, 206] {
            let client = try SearchClient(endpoint: endpoint, transport: response(fixture(), status: status))
            await assertError(.invalidResponse) { _ = try await client.search(request()) }
        }
    }

    @Test func limitsAreEnforcedForInjectedTransport() async throws {
        let data = try fixture()
        let exact = try SearchClient(endpoint: endpoint, maxResponseBytes: data.count, transport: response(data))
        _ = try await exact.search(request())
        let tooSmall = try SearchClient(endpoint: endpoint, maxResponseBytes: data.count - 1, transport: response(data))
        await assertError(.invalidResponse) { _ = try await tooSmall.search(request()) }
        var body = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        body["results"] = Array(repeating: (body["results"] as! [Any])[0], count: 2)
        let client = try SearchClient(endpoint: endpoint, transport: response(JSONSerialization.data(withJSONObject: body)))
        await assertError(.invalidResponse) { _ = try await client.search(SearchRequest(query: "x", limit: 1)) }
    }

    @Test func statusFallbacksAndSanitizedEnvelopes() async throws {
        let statuses: [(Int, SearchErrorCode)] = [(401, .auth), (402, .auth), (403, .auth), (432, .auth), (433, .auth), (429, .rateLimit), (408, .unavailable), (500, .unavailable), (503, .unavailable), (400, .providerError), (302, .providerError)]
        for (status, code) in statuses {
            let client = try SearchClient(endpoint: endpoint, transport: response(Data("private raw body".utf8), status: status))
            await assertError(code) { _ = try await client.search(request()) }
        }
        let data = Data(#"{"error":{"code":"rate_limit","attempts":[{"provider":"fixture","startedAt":"2026-10-22T00:00:00Z","durationMs":3,"outcome":"error","code":"rate_limit","status":429,"retryAfterMs":100}],"status":429,"retryAfterMs":100,"message":"private-token","body":"private-query"}}"#.utf8)
        let client = try SearchClient(endpoint: endpoint, transport: response(data, status: 503))
        do { _ = try await client.search(request()); Issue.record("Expected failure") }
        catch let error as SearchError {
            #expect(error.code == .rateLimit)
            #expect(error.status == 429)
            #expect(error.retryAfterMs == 100)
            #expect(error.attempts.count == 1)
            #expect(!String(data: try JSONEncoder().encode(error), encoding: .utf8)!.contains("private"))
            #expect(!String(reflecting: error).contains("private"))
        }
        for json in [#"{"error":{"code":"raw-secret","attempts":[]}}"#, #"{"error":{"code":"auth","attempts":null}}"#, #"{"error":{"code":"auth","attempts":[],"status":999}}"#, #"{"error":{"code":"auth","attempts":[],"retryAfterMs":-1}}"#, #"{"error":{"code":"auth","attempts":[],"retryAfterMs":null}}"#, #"{"error":{"code":"auth","attempts":[],"status":null}}"#] {
            let client = try SearchClient(endpoint: endpoint, transport: response(Data(json.utf8), status: 429))
            await assertError(.rateLimit) { _ = try await client.search(request()) }
        }
    }

    @Test func credentialAndTransportErrorsNeverDiscloseDetails() async throws {
        let count = Counter()
        let transport = StubTransport { _, _ in
            _ = await count.increment()
            throw URLError(.cannotConnectToHost, userInfo: [NSLocalizedDescriptionKey: "private-query-token"])
        }
        for token in ["", "private\r\nInjected: yes", "space token", "é"] {
            let client = try SearchClient(endpoint: endpoint, transport: transport, applicationToken: { token })
            await assertError(.auth) { _ = try await client.search(request()) }
        }
        #expect(await count.value == 0)
        let tokenError = try SearchClient(endpoint: endpoint, transport: transport, applicationToken: { throw URLError(.unknown, userInfo: [NSLocalizedDescriptionKey: "private-token"]) })
        await assertError(.auth) { _ = try await tokenError.search(request()) }
        let client = try SearchClient(endpoint: endpoint, transport: transport)
        do { _ = try await client.search(request()); Issue.record("Expected error") }
        catch let error as SearchError {
            #expect(error.code == .network)
            #expect(error.description == "SearchSDK error: network")
            #expect(!String(data: try JSONEncoder().encode(error), encoding: .utf8)!.contains("private"))
        }
        #expect(await count.value == 1) // No silent retry.
    }

    @Test func URLProtocolFragmentedReadingAndNoAmbientHeaders() async throws {
        let data = try fixture()
        FixtureProtocol.registry.configure { request in
            #expect(request.value(forHTTPHeaderField: "Authorization") == nil)
            #expect(request.value(forHTTPHeaderField: "Cookie") == nil)
            return FixtureProtocol.Plan(chunks: data.map { Data([$0]) })
        }
        let client = try SearchClient(endpoint: endpoint, transport: URLSessionGatewayTransport(protocolClasses: [FixtureProtocol.self]))
        let result = try await client.search(request())
        #expect(result.provider == "fixture")
        #expect(FixtureProtocol.registry.snapshot().0.count == 1)
    }

    @Test func URLProtocolByteCeilingCancelsStreaming() async throws {
        FixtureProtocol.registry.configure { _ in FixtureProtocol.Plan(chunks: [Data(repeating: 32, count: 100), Data(repeating: 32, count: 100)]) }
        let client = try SearchClient(endpoint: endpoint, maxResponseBytes: 150, transport: URLSessionGatewayTransport(protocolClasses: [FixtureProtocol.self]))
        await assertError(.invalidResponse) { _ = try await client.search(request()) }
    }

    @Test func URLProtocolNetworkFailureIsSanitized() async throws {
        FixtureProtocol.registry.configure { _ in FixtureProtocol.Plan(error: URLError(.networkConnectionLost, userInfo: [NSLocalizedDescriptionKey: "private-query-token"])) }
        let client = try SearchClient(endpoint: endpoint, transport: URLSessionGatewayTransport(protocolClasses: [FixtureProtocol.self]))
        await assertError(.network) { _ = try await client.search(request()) }
    }

    @Test func URLProtocolCancellationAndDeadlineStopTask() async throws {
        FixtureProtocol.registry.configure { _ in FixtureProtocol.Plan(delay: .seconds(3)) }
        let client = try SearchClient(endpoint: endpoint, timeout: 0.05, transport: URLSessionGatewayTransport(protocolClasses: [FixtureProtocol.self]))
        await assertError(.timeout) { _ = try await client.search(request()) }
        try await Task.sleep(for: .milliseconds(20))
        #expect(FixtureProtocol.registry.snapshot().1 >= 1)
        let task = Task { try await client.search(request()) }
        try await Task.sleep(for: .milliseconds(10))
        task.cancel()
        await assertError(.aborted) { _ = try await task.value }
    }
}

extension SearchSDKTests {
    @Test func URLSessionRejectsRedirectWithoutForwardingToken() async throws {
        for (target, status) in [("https://other.example.test/target", 302), ("https://gateway.example.test/target", 307), ("http://other.example.test/target", 308)] {
            FixtureProtocol.registry.configure { _ in
                FixtureProtocol.Plan(status: status, headers: ["Location": target], redirect: URL(string: target)!)
            }
            let client = try SearchClient(endpoint: "https://gateway.example.test", timeout: 1,
                                          transport: URLSessionGatewayTransport(protocolClasses: [FixtureProtocol.self]), applicationToken: { "app-secret" })
            do { _ = try await client.search(SearchRequest(query: "private-query")); Issue.record("Expected rejection") }
            catch let error as SearchError {
                #expect(error.code == .providerError)
                #expect(error.status == status)
            }
            let calls = FixtureProtocol.registry.snapshot().0
            #expect(calls.count == 1)
            #expect(calls.first?.url?.absoluteString == "https://gateway.example.test")
            #expect(calls.first?.value(forHTTPHeaderField: "Authorization") == "Bearer app-secret")
        }
    }

    @Test func unknownSuccessFieldsAreNeverRetained() async throws {
        var body = try JSONSerialization.jsonObject(with: fixture()) as! [String: Any]
        body["raw"] = "private-provider-body"
        var results = body["results"] as! [[String: Any]]
        results[0]["apiKey"] = "private-provider-key"
        var provenance = results[0]["provenance"] as! [String: Any]
        provenance["internal"] = "private-credential"
        results[0]["provenance"] = provenance
        body["results"] = results
        let client = try SearchClient(endpoint: endpoint, transport: response(JSONSerialization.data(withJSONObject: body)))
        let value = try await client.search(request())
        #expect(!String(data: try JSONEncoder().encode(value), encoding: .utf8)!.contains("private"))
    }

    @Test func oversizedErrorBodyCancelsBeforeEnvelopeDecode() async throws {
        FixtureProtocol.registry.configure { _ in
            FixtureProtocol.Plan(status: 429, chunks: [Data(repeating: 32, count: 100), Data(repeating: 32, count: 100)])
        }
        let client = try SearchClient(endpoint: endpoint, maxResponseBytes: 150, transport: URLSessionGatewayTransport(protocolClasses: [FixtureProtocol.self]))
        await assertError(.invalidResponse) { _ = try await client.search(request()) }
    }
}
