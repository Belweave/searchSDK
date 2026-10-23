import Foundation
import Testing
import SearchSDK

struct ConformanceTests {
    func load(_ name: String) throws -> Data {
        try Data(contentsOf: Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures")!)
    }
    @Test func sharedRequestCases() throws {
        let cases = try JSONSerialization.jsonObject(with: load("request-cases")) as! [String: Any]
        #expect(cases["protocolVersion"] as? Int == 1)
        for row in cases["valid"] as! [[String: Any]] {
            let request = try JSONDecoder().decode(SearchRequest.self, from: JSONSerialization.data(withJSONObject: row["input"]!, options: [.fragmentsAllowed]))
            let expected = try JSONDecoder().decode(SearchRequest.self, from: JSONSerialization.data(withJSONObject: row["normalized"]!))
            #expect(request == expected, "\(row["name"]!)")
            let encoded = try JSONSerialization.jsonObject(with: JSONEncoder().encode(request)) as! NSDictionary
            #expect(encoded == (row["normalized"] as! NSDictionary))
        }
        for row in cases["invalid"] as! [[String: Any]] {
            let input = try JSONSerialization.data(withJSONObject: row["input"]!, options: [.fragmentsAllowed])
            do { _ = try JSONDecoder().decode(SearchRequest.self, from: input); Issue.record("Accepted \(row["name"]!)") }
            catch let error as SearchError { #expect(error.code.rawValue == row["code"] as? String) }
        }
    }
    @Test func sharedSuccessAndErrorEnvelopes() async throws {
        let data = try load("search-success")
        let success = try SearchClient(endpoint: "https://gateway.example.test", transport: StubTransport { _, _ in
            GatewayHTTPResponse(status: 200, body: data)
        })
        let value = try await success.search(SearchRequest(query: "fixture"))
        #expect(value.results[0].provenance.requestId == "fixture-001")
        #expect(value.usage == nil)
        for row in try JSONSerialization.jsonObject(with: load("search-errors")) as! [[String: Any]] {
            let status = row["httpStatus"] as! Int
            let data = try JSONSerialization.data(withJSONObject: row["body"]!)
            let body = row["body"] as! [String: Any]
            let code = (body["error"] as! [String: Any])["code"] as! String
            let client = try SearchClient(endpoint: "https://gateway.example.test", transport: StubTransport { _, _ in
                GatewayHTTPResponse(status: status, body: data)
            })
            do { _ = try await client.search(SearchRequest(query: "fixture")); Issue.record("Expected error \(status)") }
            catch let error as SearchError { #expect(error.code.rawValue == code) }
        }
    }
}
