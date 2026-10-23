using System.Text.Json.Serialization;
using System.Globalization;

namespace SearchSdk;

/// <summary>Valyu web-search subset; native request budget is not an SDK cost estimate.</summary>
public sealed record ValyuSearchOptions
{
    [JsonPropertyName("max_price")]
    public double? MaxPrice
    { get; init; }
    [JsonPropertyName("relevance_threshold")]
    public double? RelevanceThreshold
    { get; init; }
    [JsonPropertyName("response_length")]
    public NativeUnion<string, long>? ResponseLength
    { get; init; }
    [JsonPropertyName("fast_mode")]
    public bool? FastMode
    { get; init; }
    [JsonPropertyName("start_date")]
    public string? StartDate
    { get; init; }
    [JsonPropertyName("end_date")]
    public string? EndDate
    { get; init; }
    [JsonPropertyName("instructions")]
    public string? Instructions
    { get; init; }
    internal void Validate()
    {
        if (MaxPrice is { } price && (!double.IsFinite(price) || price <= 0) || RelevanceThreshold is { } relevance && (!double.IsFinite(relevance) || relevance < 0 || relevance > 1) || Instructions is not null && (string.IsNullOrWhiteSpace(Instructions) || Instructions.Length > 500))
            throw new SearchException("configuration");
        if (ResponseLength is { } length)
        {
            var value = length.Raw;
            bool valid = value.ValueKind == System.Text.Json.JsonValueKind.String && value.GetString() is "short" or "medium" or "large" or "max" || value.ValueKind == System.Text.Json.JsonValueKind.Number && value.TryGetInt64(out var n) && n > 0 && n <= 9007199254740991;
            if (!valid)
                throw new SearchException("configuration");
        }
        foreach (var date in new[] { StartDate, EndDate })
            if (date is not null && (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed) || parsed.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) != date))
                throw new SearchException("configuration");
        if (StartDate is not null && EndDate is not null && string.CompareOrdinal(StartDate, EndDate) > 0)
            throw new SearchException("configuration");
    }
}
/// <summary>Settings for a trusted operator-selected HTTPS SearXNG instance with JSON enabled.</summary>
public sealed record SearxngSearchOptions
{
    public string? Language
    { get; init; }
    public int? SafeSearch
    { get; init; }
    public string? TimeRange
    { get; init; }
    public IReadOnlyList<string>? Categories
    { get; init; }
    public IReadOnlyDictionary<string, string>? Headers
    { get; init; }
    internal void Validate()
    {
        if (Language is not null && !System.Text.RegularExpressions.Regex.IsMatch(Language, @"\A[a-zA-Z][a-zA-Z0-9_-]{0,34}\z", System.Text.RegularExpressions.RegexOptions.CultureInvariant) || SafeSearch is not null and not (0 or 1 or 2) || TimeRange is not null and not ("day" or "month" or "year") || Categories is not null && (Categories.Count is < 1 or > 20 || Categories.Any(s => s is null || !System.Text.RegularExpressions.Regex.IsMatch(s, @"\A[a-zA-Z][a-zA-Z0-9 _-]{0,63}\z", System.Text.RegularExpressions.RegexOptions.CultureInvariant))) || Headers?.Count > 32)
            throw new SearchException("configuration");
        if (Headers is not null)
            foreach (var (k, v) in Headers)
            {
                if (new[] { "host", "cookie", "connection", "content-length", "transfer-encoding", "accept", "content-type" }.Contains(k.ToLowerInvariant()) || v is null || v.Length > 8192)
                    throw new SearchException("configuration");
                using var request = new HttpRequestMessage();
                try
                {
                    SearchTransport.Header(request, k, v);
                }
                catch { throw new SearchException("configuration"); }
            }
    }
}
