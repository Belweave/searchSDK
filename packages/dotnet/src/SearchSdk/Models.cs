using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace SearchSdk;

/// <summary>A sanitized failure. Never contains upstream bodies, URLs, queries, keys, or transport exceptions.</summary>
public sealed class SearchException : Exception
{
    public string Code
    { get; }
    public int? Status
    { get; }
    public double? RetryAfterMs
    { get; }
    public IReadOnlyList<SearchAttempt> Attempts
    { get; }
    public SearchException(string code, int? status = null, double? retryAfterMs = null, IReadOnlyList<SearchAttempt>? attempts = null)
        : base($"Search operation failed ({(Codes.Contains(code) ? code : "provider_error")}).")
    {
        Code = Codes.Contains(code) ? code : "provider_error";
        Status = status;
        RetryAfterMs = retryAfterMs;
        Attempts = (attempts ?? []).ToArray();
    }
    internal static readonly HashSet<string> Codes = ["invalid_request", "unsupported_option", "configuration", "auth", "rate_limit", "network", "unavailable", "attempt_timeout", "timeout", "aborted", "invalid_response", "provider_error"];
    internal static string StatusCode(int s) => s is 401 or 402 or 403 or 432 or 433 ? "auth" : s == 429 ? "rate_limit" : s == 408 || s is >= 500 and <= 599 ? "unavailable" : "provider_error";
}

public sealed record SearchRequest(string Query, int Limit = 5, IReadOnlyList<string>? IncludeDomains = null, IReadOnlyList<string>? ExcludeDomains = null)
{
    public SearchRequest Validate()
    {
        if (string.IsNullOrWhiteSpace(Query) || Limit is < 1 or > 20)
            throw new SearchException("invalid_request");
        var include = Domains(IncludeDomains);
        var exclude = Domains(ExcludeDomains);
        if (include?.Intersect(exclude ?? []).Any() == true)
            throw new SearchException("invalid_request");
        return this with
        {
            IncludeDomains = include,
            ExcludeDomains = exclude
        };
    }
    private static string[]? Domains(IReadOnlyList<string>? values)
    {
        if (values is null)
            return null;
        if (values.Count == 0 || values.Any(d => d is null || d.Length > 253 || d.Split('.').Length < 2 || d.Split('.').Any(p => !Regex.IsMatch(p, "^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\z", RegexOptions.CultureInvariant))))
            throw new SearchException("invalid_request");
        return values.Select(d => d.ToLowerInvariant()).Distinct().ToArray();
    }
    /// <summary>Strict parser for untrusted JSON; rejects unknown fields and explicit null options.</summary>
    public static SearchRequest FromJson(JsonElement value)
    {
        try
        {
            Wire.Object(value);
            if (value.EnumerateObject().Any(p => !new[] { "query", "limit", "includeDomains", "excludeDomains" }.Contains(p.Name)))
                throw new SearchException("invalid_request");
            IReadOnlyList<string>? ReadDomains(string n) => value.TryGetProperty(n, out var v) ? v.EnumerateArray().Select(x => x.GetString()!).ToArray() : null;
            return new SearchRequest(value.GetProperty("query").GetString()!, value.TryGetProperty("limit", out var l) ? l.GetInt32() : 5, ReadDomains("includeDomains"), ReadDomains("excludeDomains")).Validate();
        }
        catch { throw new SearchException("invalid_request"); }
    }
}
public sealed record Provenance(string Provider, string SourceUrl, string RetrievedAt, string? RequestId = null);
public sealed record SearchResult(string Url, Provenance Provenance, string? Title = null, string? Snippet = null, IReadOnlyList<string>? Highlights = null, double? Score = null);
public sealed record SearchUsage(string Unit, double Value);
public sealed record SearchWarning(string Code, string Provider);
public sealed record SearchAttempt(string Provider, string StartedAt, double DurationMs, string Outcome, string? Code = null, int? Status = null, double? RetryAfterMs = null);
public sealed record SearchResponse(string Provider, IReadOnlyList<SearchResult> Results, SearchUsage? Usage, IReadOnlyList<SearchWarning> Warnings, IReadOnlyList<SearchAttempt> Attempts, string? Reuse = null);
public sealed record BatchOutcome(int Index, SearchResponse? Value, SearchException? Error)
{
    public bool IsSuccess => Error is null;
}
public sealed record ProviderCapabilities(bool DomainFilters, int MaxIncludeDomains, int MaxExcludeDomains, bool MutuallyExclusiveDomainFilters = false, int? MaxQueryLength = null)
{
    public void Validate(SearchRequest r)
    {
        if ((!DomainFilters && (r.IncludeDomains is not null || r.ExcludeDomains is not null)) || (r.IncludeDomains?.Count ?? 0) > MaxIncludeDomains || (r.ExcludeDomains?.Count ?? 0) > MaxExcludeDomains || MutuallyExclusiveDomainFilters && r.IncludeDomains is not null && r.ExcludeDomains is not null || r.Query.Length > (MaxQueryLength ?? int.MaxValue))
            throw new SearchException("unsupported_option");
    }
}

/// <summary>Shared JSON settings for wire models. Unions and undocumented values remain JsonElement.</summary>
public static class Wire
{
    public static JsonSerializerOptions Json { get; } = CreateJson();
    private static JsonSerializerOptions CreateJson()
    {
        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull, PropertyNameCaseInsensitive = false, MaxDepth = 64 };
        options.MakeReadOnly(populateMissingResolver: true);
        return options;
    }
    internal static JsonElement Get(JsonElement x, string n) => x.ValueKind == JsonValueKind.Object && x.TryGetProperty(n, out var p) ? p : default;
    internal static void Object(JsonElement x)
    {
        if (x.ValueKind != JsonValueKind.Object)
            throw new SearchException("invalid_response");
    }
    internal static string? String(JsonElement x) => x.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null ? null : x.ValueKind == JsonValueKind.String ? x.GetString() : throw new SearchException("invalid_response");
    internal static double? Number(JsonElement x) => x.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null ? null : x.ValueKind == JsonValueKind.Number && x.TryGetDouble(out var d) && double.IsFinite(d) ? d : throw new SearchException("invalid_response");
    internal static string[]? Strings(JsonElement x) => x.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null ? null : Array(x).Select(v => v.ValueKind == JsonValueKind.String ? v.GetString()! : throw new SearchException("invalid_response")).ToArray();
    internal static JsonElement[] Array(JsonElement x) => x.ValueKind == JsonValueKind.Array ? x.EnumerateArray().ToArray() : throw new SearchException("invalid_response");
    internal static string Url(string? s)
    {
        if (s is null || !Regex.IsMatch(s, "^https?://[^/\\\\]", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant) || s.Any(c => char.IsWhiteSpace(c) || char.IsControl(c) || c == '\\') || !Uri.TryCreate(s, UriKind.Absolute, out var u) || u.Scheme is not ("http" or "https") || u.UserInfo.Length != 0)
            throw new SearchException("invalid_response");
        return s;
    }
    internal static string Id(string? s) => s is not null && Regex.IsMatch(s, "^[a-zA-Z0-9_-]{1,64}\\z", RegexOptions.CultureInvariant) ? s : throw new SearchException("invalid_response");
    internal static string? RequestId(JsonElement x)
    {
        var s = String(x);
        if (s is not null && !Regex.IsMatch(s, "^[a-zA-Z0-9_.:/-]{1,256}\\z", RegexOptions.CultureInvariant))
            throw new SearchException("invalid_response");
        return s;
    }
    internal static void Timestamp(string? s)
    {
        if (s is null || !Regex.IsMatch(s, @"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\z", RegexOptions.CultureInvariant) || !DateTimeOffset.TryParse(s, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
            throw new SearchException("invalid_response");
    }
    internal static SearchAttempt[] Attempts(JsonElement v) => Array(v).Select(a =>
    {
        Object(a);
        if (new[] { "code", "status", "retryAfterMs" }.Any(n => Get(a, n).ValueKind == JsonValueKind.Null))
            throw new SearchException("invalid_response");
        var provider = Id(String(Get(a, "provider")));
        var started = String(Get(a, "startedAt"))!;
        Timestamp(started);
        var duration = Number(Get(a, "durationMs"));
        var outcome = String(Get(a, "outcome"));
        var code = String(Get(a, "code"));
        var status = Number(Get(a, "status"));
        var retry = Number(Get(a, "retryAfterMs"));
        if (duration is null or < 0 || outcome is not ("success" or "error") || code is not null && !SearchException.Codes.Contains(code) || status is not null && (status < 100 || status > 599 || status != Math.Truncate(status.Value)) || retry < 0)
            throw new SearchException("invalid_response");
        return new SearchAttempt(provider, started, duration.Value, outcome!, code, (int?)status, retry);
    }).ToArray();
    internal static SearchResponse Response(JsonElement v)
    {
        Object(v);
        var provider = Id(String(Get(v, "provider")));
        var rows = Array(Get(v, "results")).Select(r =>
        {
            Object(r);
            var p = Get(r, "provenance");
            Object(p);
            var timestamp = String(Get(p, "retrievedAt"))!;
            Timestamp(timestamp);
            return new SearchResult(Url(String(Get(r, "url"))), new Provenance(Id(String(Get(p, "provider"))), Url(String(Get(p, "sourceUrl"))), timestamp, RequestId(Get(p, "requestId"))), String(Get(r, "title")), String(Get(r, "snippet")), Strings(Get(r, "highlights")), Number(Get(r, "score")));
        }).ToArray();
        SearchUsage? usage = null;
        var u = Get(v, "usage");
        if (u.ValueKind != JsonValueKind.Null)
        {
            Object(u);
            var unit = String(Get(u, "unit"));
            var amount = Number(Get(u, "value"));
            if (unit is not ("usd" or "credits") || amount is null or < 0)
                throw new SearchException("invalid_response");
            usage = new(unit!, amount.Value);
        }
        var warnings = Array(Get(v, "warnings")).Select(w => { Object(w); var c = String(Get(w, "code")); if (c is not ("fallback_used" or "provider_warning")) throw new SearchException("invalid_response"); return new SearchWarning(c!, Id(String(Get(w, "provider")))); }).ToArray();
        var reuse = String(Get(v, "reuse"));
        if (Get(v, "reuse").ValueKind == JsonValueKind.Null || reuse is not null and not ("cache" or "inflight"))
            throw new SearchException("invalid_response");
        return new(provider, rows, usage, warnings, Attempts(Get(v, "attempts")), reuse);
    }
}
