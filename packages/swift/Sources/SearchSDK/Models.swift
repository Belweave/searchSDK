import Foundation

public enum SearchErrorCode: String, Codable, Sendable, CaseIterable {
    case invalidRequest = "invalid_request"
    case unsupportedOption = "unsupported_option"
    case configuration, auth
    case rateLimit = "rate_limit"
    case network, unavailable
    case attemptTimeout = "attempt_timeout"
    case timeout, aborted
    case invalidResponse = "invalid_response"
    case providerError = "provider_error"
}

/// Contains public, validated protocol metadata only. Never wraps an underlying error or body.
public struct SearchError: Error, Sendable, Encodable, CustomStringConvertible, CustomDebugStringConvertible {
    public let code: SearchErrorCode
    public let attempts: [SearchAttempt]
    public let status: Int?
    public let retryAfterMs: Double?

    internal init(_ code: SearchErrorCode, attempts: [SearchAttempt] = [], status: Int? = nil, retryAfterMs: Double? = nil) {
        self.code = code
        self.attempts = attempts
        self.status = status
        self.retryAfterMs = retryAfterMs
    }

    public var description: String { "SearchSDK error: \(code.rawValue)" }
    public var debugDescription: String { description }
}

/// Immutable, validated normalized request. Provider-native fields cannot be represented.
public struct SearchRequest: Codable, Sendable, Equatable {
    public let query: String
    public let limit: Int
    public let includeDomains: [String]?
    public let excludeDomains: [String]?

    public init(query: String, limit: Int = 5, includeDomains: [String]? = nil, excludeDomains: [String]? = nil) throws {
        guard Validation.nonblankQuery(query), (1...20).contains(limit) else {
            throw SearchError(.invalidRequest)
        }
        let included = try Validation.domains(includeDomains)
        let excluded = try Validation.domains(excludeDomains)
        guard Set(included ?? []).isDisjoint(with: excluded ?? []) else { throw SearchError(.invalidRequest) }
        self.query = query
        self.limit = limit
        self.includeDomains = included
        self.excludeDomains = excluded
    }

    private enum CodingKeys: String, CodingKey { case query, limit, includeDomains, excludeDomains }
    private struct AnyKey: CodingKey {
        let stringValue: String
        let intValue: Int? = nil
        init?(stringValue: String) { self.stringValue = stringValue }
        init?(intValue: Int) { return nil }
    }
    public init(from decoder: any Decoder) throws {
        do {
            let fields = try decoder.container(keyedBy: AnyKey.self)
            let allowed: Set<String> = ["query", "limit", "includeDomains", "excludeDomains"]
            guard fields.allKeys.allSatisfy({ allowed.contains($0.stringValue) }) else { throw SearchError(.invalidRequest) }
            let c = try decoder.container(keyedBy: CodingKeys.self)
            for key in [CodingKeys.limit, .includeDomains, .excludeDomains] where c.contains(key) {
                guard try !c.decodeNil(forKey: key) else { throw SearchError(.invalidRequest) }
            }
            try self.init(query: c.decode(String.self, forKey: .query), limit: c.decodeIfPresent(Int.self, forKey: .limit) ?? 5,
                          includeDomains: c.decodeIfPresent([String].self, forKey: .includeDomains),
                          excludeDomains: c.decodeIfPresent([String].self, forKey: .excludeDomains))
        } catch { throw SearchError(.invalidRequest) }
    }
}

public struct SearchProvenance: Codable, Sendable, Equatable {
    public let provider: String
    public let sourceUrl: String
    public let retrievedAt: String
    public let requestId: String?
}

public struct SearchResult: Codable, Sendable, Equatable {
    public let url: String
    public let title: String?
    public let snippet: String?
    public let highlights: [String]?
    /// Provider-native score; not comparable across providers.
    public let score: Double?
    public let provenance: SearchProvenance
}

public struct SearchUsage: Codable, Sendable, Equatable {
    public enum Unit: String, Codable, Sendable { case usd, credits }
    public let unit: Unit
    public let value: Double
}

public struct SearchWarning: Codable, Sendable, Equatable {
    public enum Code: String, Codable, Sendable { case fallbackUsed = "fallback_used", providerWarning = "provider_warning" }
    public let code: Code
    public let provider: String
}

public struct SearchAttempt: Codable, Sendable, Equatable {
    public enum Outcome: String, Codable, Sendable { case success, error }
    public let provider: String
    public let startedAt: String
    public let durationMs: Double
    public let outcome: Outcome
    public let code: SearchErrorCode?
    public let status: Int?
    public let retryAfterMs: Double?

    private enum CodingKeys: String, CodingKey { case provider, startedAt, durationMs, outcome, code, status, retryAfterMs }
    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        provider = try c.decode(String.self, forKey: .provider)
        startedAt = try c.decode(String.self, forKey: .startedAt)
        durationMs = try c.decode(Double.self, forKey: .durationMs)
        outcome = try c.decode(Outcome.self, forKey: .outcome)
        code = try c.decodeOmitted(SearchErrorCode.self, forKey: .code)
        status = try c.decodeOmitted(Int.self, forKey: .status)
        retryAfterMs = try c.decodeOmitted(Double.self, forKey: .retryAfterMs)
    }
}

public struct SearchResponse: Codable, Sendable, Equatable {
    public enum Reuse: String, Codable, Sendable { case cache, inflight }
    public let provider: String
    public let results: [SearchResult]
    public let usage: SearchUsage?
    public let warnings: [SearchWarning]
    public let attempts: [SearchAttempt]
    public let reuse: Reuse?

    private enum CodingKeys: String, CodingKey { case provider, results, usage, warnings, attempts, reuse }
    public init(from decoder: any Decoder) throws {
        do {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            provider = try c.decode(String.self, forKey: .provider)
            results = try c.decode([SearchResult].self, forKey: .results)
            guard results.count <= 20 else { throw SearchError(.invalidResponse) }
            // Absent usage is malformed; explicit null means unknown usage.
            guard c.contains(.usage) else { throw SearchError(.invalidResponse) }
            usage = try c.decodeIfPresent(SearchUsage.self, forKey: .usage)
            warnings = try c.decode([SearchWarning].self, forKey: .warnings)
            attempts = try c.decode([SearchAttempt].self, forKey: .attempts)
            reuse = try c.decodeOmitted(Reuse.self, forKey: .reuse)
            try Validation.response(self)
        } catch { throw SearchError(.invalidResponse) }
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(provider, forKey: .provider)
        try c.encode(results, forKey: .results)
        try c.encode(usage, forKey: .usage)
        try c.encode(warnings, forKey: .warnings)
        try c.encode(attempts, forKey: .attempts)
        try c.encodeIfPresent(reuse, forKey: .reuse)
    }
}

public struct SearchBatchResult: Sendable {
    public let index: Int
    public let result: Result<SearchResponse, SearchError>
}
