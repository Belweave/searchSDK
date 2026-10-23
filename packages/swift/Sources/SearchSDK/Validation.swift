import Foundation

internal enum Validation {
    static func matches(_ value: String, _ pattern: String) -> Bool {
        value.range(of: pattern, options: .regularExpression) != nil
    }

    // Match ECMAScript String.trim(), the normalized TypeScript reference semantics.
    static func nonblankQuery(_ value: String) -> Bool {
        value.unicodeScalars.contains { scalar in
            switch scalar.value {
            case 0x0009...0x000D, 0x0020, 0x00A0, 0x1680, 0x2000...0x200A,
                 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF: return false
            default: return true
            }
        }
    }

    static func domains(_ values: [String]?) throws -> [String]? {
        guard let values else { return nil }
        guard !values.isEmpty else { throw SearchError(.invalidRequest) }
        var seen = Set<String>()
        return try values.compactMap { value in
            let labels = value.split(separator: ".", omittingEmptySubsequences: false)
            guard value.utf8.count <= 253, labels.count >= 2,
                  labels.allSatisfy({ matches(String($0), "\\A[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\z") }) else {
                throw SearchError(.invalidRequest)
            }
            let lower = value.lowercased()
            return seen.insert(lower).inserted ? lower : nil
        }
    }

    static func safeURL(_ value: String, endpoint: Bool = false) -> URL? {
        guard !value.unicodeScalars.contains(where: { CharacterSet.whitespacesAndNewlines.contains($0) ||
            CharacterSet.controlCharacters.contains($0) || $0 == "\\" }),
            matches(value.lowercased(), endpoint ? "\\Ahttps://[^/\\\\]" : "\\Ahttps?://[^/\\\\]"),
            let components = URLComponents(string: value),
            let host = components.host, !host.isEmpty,
            components.user == nil, components.password == nil,
            !endpoint || (components.query == nil && components.fragment == nil),
            let url = components.url else { return nil }
        // URLComponents accepts invalid port ranges; these are not usable HTTP endpoints.
        if let port = components.port, !(1...65535).contains(port) { return nil }
        return url
    }

    static func provider(_ value: String) -> Bool { matches(value, "\\A[A-Za-z0-9_-]{1,64}\\z") }
    static func date(_ value: String) -> Bool {
        guard matches(value, "\\A[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})\\z") else { return false }
        let fields = value.prefix(19).split(whereSeparator: { !$0.isNumber }).compactMap { Int($0) }
        guard fields.count == 6 else { return false }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let components = DateComponents(year: fields[0], month: fields[1], day: fields[2],
                                        hour: fields[3], minute: fields[4], second: fields[5])
        guard components.isValidDate(in: calendar) else { return false }
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if parser.date(from: value) != nil { return true }
        parser.formatOptions = [.withInternetDateTime]
        return parser.date(from: value) != nil
    }
    static func status(_ value: Int?) -> Bool { value.map { (100...599).contains($0) } ?? true }
    static func nonnegative(_ value: Double?) -> Bool { value.map { $0.isFinite && $0 >= 0 } ?? true }
    static func attempts(_ values: [SearchAttempt]) throws {
        guard values.count <= 1024 else { throw SearchError(.invalidResponse) }
        for value in values {
            guard provider(value.provider), date(value.startedAt), nonnegative(value.durationMs),
                  status(value.status), nonnegative(value.retryAfterMs) else { throw SearchError(.invalidResponse) }
        }
    }
    static func response(_ value: SearchResponse) throws {
        guard provider(value.provider) else { throw SearchError(.invalidResponse) }
        for result in value.results {
            let p = result.provenance
            guard safeURL(result.url) != nil, safeURL(p.sourceUrl) != nil, provider(p.provider), date(p.retrievedAt),
                  result.score.map({ $0.isFinite }) ?? true,
                  p.requestId.map({ matches($0, "\\A[A-Za-z0-9_.:/-]{1,256}\\z") }) ?? true else {
                throw SearchError(.invalidResponse)
            }
        }
        if let usage = value.usage, !nonnegative(usage.value) { throw SearchError(.invalidResponse) }
        guard value.warnings.allSatisfy({ provider($0.provider) }) else { throw SearchError(.invalidResponse) }
        try attempts(value.attempts)
    }
    static func timeout(_ value: TimeInterval) -> Bool { value.isFinite && value > 0 && value <= 86_400 }
}

/// An optional protocol field may be omitted; explicit JSON null is not a typed value.
internal extension KeyedDecodingContainer {
    func decodeOmitted<T: Decodable>(_ type: T.Type, forKey key: Key) throws -> T? {
        guard contains(key) else { return nil }
        return try decode(type, forKey: key)
    }
}
