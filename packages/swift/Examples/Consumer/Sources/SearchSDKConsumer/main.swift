import Foundation
import SearchSDK

/// Runnable default integration: exercises public APIs without credentials or network access.
private struct FixtureGateway: GatewayTransport {
    func execute(_ request: URLRequest, maxResponseBytes: Int) async throws -> GatewayHTTPResponse {
        let input = try JSONDecoder().decode(SearchRequest.self, from: request.httpBody ?? Data())
        guard request.httpMethod == "POST", request.url?.absoluteString == "https://gateway.example.test/search",
              request.value(forHTTPHeaderField: "Authorization") == "Bearer synthetic-app-token", input.limit == 5 else {
            // The SDK sanitizes transport exceptions; never include requests or tokens in diagnostics.
            throw URLError(.badServerResponse)
        }
        let body = Data(#"{"provider":"fixture","results":[{"url":"https://example.com/search","title":"Synthetic result","provenance":{"provider":"fixture","sourceUrl":"https://example.com/search","retrievedAt":"2026-10-22T00:00:00Z"}}],"usage":null,"warnings":[],"attempts":[]}"#.utf8)
        precondition(body.count <= maxResponseBytes)
        return GatewayHTTPResponse(status: 200, headers: ["X-SearchSDK-Protocol": "1"], body: body)
    }
}

@main
private struct Consumer {
    static func main() async throws {
        let live = CommandLine.arguments.contains("--live")
        let client: SearchClient
        if live {
            // Explicit manual opt-in. The gateway must keep provider keys server-side.
            guard let endpoint = ProcessInfo.processInfo.environment["SEARCHSDK_GATEWAY_URL"] else {
                print("Set SEARCHSDK_GATEWAY_URL to your exact HTTPS gateway endpoint.")
                return
            }
            client = try SearchClient(endpoint: endpoint, applicationToken: {
                ProcessInfo.processInfo.environment["SEARCHSDK_APPLICATION_TOKEN"]
            })
        } else {
            client = try SearchClient(endpoint: "https://gateway.example.test/search", transport: FixtureGateway(),
                                      applicationToken: { "synthetic-app-token" })
        }
        let request = try SearchRequest(query: "SDK integration", includeDomains: ["EXAMPLE.com", "example.com"])
        do {
            let response = try await client.search(request)
            print("Search completed: \(response.results.count) result(s), provider \(response.provider).")
            let outcomes = try await client.searchBatch([request, request], concurrency: 2)
            precondition(outcomes.map(\.index) == [0, 1])
            for item in outcomes { _ = try item.result.get() }
            print("Ordered batch completed: \(outcomes.count) item(s).")
            if !live { precondition(response.results.first?.provenance.provider == "fixture") }
        } catch let error as SearchError {
            // Print only the sanitized code. Do not log tokens, requests, response bodies, or underlying errors.
            print("Search failed: \(error.code.rawValue)")
            throw error
        }
    }
}
