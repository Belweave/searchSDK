using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace SearchSdk;

public interface ISearchClient
{
    Task<SearchResponse> SearchAsync(SearchRequest request, CancellationToken cancellationToken = default);
}
/// <summary>One-page web-search adapters. Native endpoints have separate clients and models.</summary>
public sealed class NormalizedProvider : ISearchClient
{
    public string Id
    { get; }
    public ProviderCapabilities Capabilities
    { get; }
    private readonly SearchTransport _transport;
    private readonly string? _key;
    private readonly string? _searxng;
    private readonly ValyuSearchOptions? _valyu;
    private readonly SearxngSearchOptions? _searxSettings;
    public static IReadOnlyList<string> SupportedProviders { get; } = System.Array.AsReadOnly(new[] { "context", "tinyfish", "exa", "tavily", "brave", "perplexity", "parallel", "linkup", "you", "serper", "serpapi", "firecrawl", "valyu", "searxng" });
    public TimeProvider TimeProvider { get; init; } = TimeProvider.System;
    public NormalizedProvider(string provider, string? apiKey, SearchTransport transport, string? searxngBaseUrl = null, ValyuSearchOptions? valyu = null, SearxngSearchOptions? searxng = null)
    {
        _transport = transport ?? throw new SearchException("configuration");
        Id = provider;
        if (valyu is not null && provider != "valyu" || searxng is not null && provider != "searxng")
            throw new SearchException("configuration");
        valyu?.Validate();
        searxng?.Validate();
        _valyu = valyu;
        _searxSettings = searxng is null ? null : searxng with
        {
            Categories = searxng.Categories?.ToArray(),
            Headers = searxng.Headers?.ToDictionary(p => p.Key, p => p.Value)
        };
        Capabilities = provider switch
        {
            "context" => new(true, 100, 100, false, 500),
            "tinyfish" or "valyu" => new(true, 100, 100),
            "exa" => new(true, 1200, 1200),
            "tavily" => new(true, 300, 150),
            "perplexity" => new(true, 20, 20, true),
            "parallel" => new(true, 200, 200, true),
            "linkup" => new(true, 100, 50),
            "you" => new(true, 500, 5000, true),
            "firecrawl" => new(true, 100, 100, true, 500),
            "brave" or "serper" or "serpapi" or "searxng" => new(false, 0, 0),
            _ => throw new SearchException("configuration")
        };
        if (provider == "searxng")
            _searxng = SearchTransport.Endpoint(searxngBaseUrl ?? "").ToString().TrimEnd('/') + "/search";
        else
        {
            SearchTransport.Credential(apiKey);
            _key = apiKey;
        }
    }
    public Task<SearchResponse> SearchAsync(SearchRequest request, CancellationToken cancellationToken = default)
    {
        request = (request ?? throw new SearchException("invalid_request")).Validate();
        Capabilities.Validate(request);
        return _transport.RunAsync(_ => Task.FromResult(Build(request)), raw =>
        {
            try
            {
                return Normalize(raw.Json, request.Limit);
            }
            catch (SearchException) { throw; }
            catch { throw new SearchException("invalid_response"); }
        }, cancellationToken);
    }
    private HttpRequestMessage Build(SearchRequest r)
    {
        string url = Id switch
        {
            "context" => "https://api.context.dev/v1/web/search",
            "tinyfish" => "https://api.search.tinyfish.ai/",
            "exa" => "https://api.exa.ai/search",
            "tavily" => "https://api.tavily.com/search",
            "brave" => "https://api.search.brave.com/res/v1/web/search",
            "perplexity" => "https://api.perplexity.ai/search",
            "parallel" => "https://api.parallel.ai/v1/search",
            "linkup" => "https://api.linkup.so/v1/search",
            "you" => "https://ydc-index.io/v1/search",
            "serper" => "https://google.serper.dev/search",
            "serpapi" => "https://serpapi.com/search.json",
            "firecrawl" => "https://api.firecrawl.dev/v2/search",
            "valyu" => "https://api.valyu.ai/v1/search",
            _ => _searxng!
        };
        var b = new JsonObject();
        var q = new Dictionary<string, string>();
        bool get = Id is "tinyfish" or "brave" or "serpapi";
        void Filters(string i, string e)
        {
            if (r.IncludeDomains is not null)
                b[i] = JsonSerializer.SerializeToNode(r.IncludeDomains);
            if (r.ExcludeDomains is not null)
                b[e] = JsonSerializer.SerializeToNode(r.ExcludeDomains);
        }
        switch (Id)
        {
            case "context":
                b["query"] = r.Query;
                b["numResults"] = Math.Max(10, r.Limit);
                Filters("includeDomains", "excludeDomains");
                break;
            case "tinyfish":
                q["query"] = r.Query;
                q["domain_type"] = "web";
                q["page"] = "0";
                if (r.IncludeDomains is not null)
                    q["include_domains"] = string.Join(',', r.IncludeDomains);
                if (r.ExcludeDomains is not null)
                    q["exclude_domains"] = string.Join(',', r.ExcludeDomains);
                break;
            case "exa":
                b["query"] = r.Query;
                b["numResults"] = r.Limit;
                b["type"] = "auto";
                b["contents"] = new JsonObject { ["highlights"] = true };
                Filters("includeDomains", "excludeDomains");
                break;
            case "tavily":
                b["query"] = r.Query;
                b["max_results"] = r.Limit;
                b["search_depth"] = "basic";
                b["include_usage"] = true;
                b["auto_parameters"] = false;
                b["include_answer"] = false;
                b["include_raw_content"] = false;
                Filters("include_domains", "exclude_domains");
                if (r.IncludeDomains is not null)
                    b["include_domains_mode"] = "restrict";
                break;
            case "brave":
                q["q"] = r.Query;
                q["count"] = r.Limit.ToString(System.Globalization.CultureInfo.InvariantCulture);
                q["extra_snippets"] = "true";
                break;
            case "perplexity":
                b["query"] = r.Query;
                b["max_results"] = r.Limit;
                b["search_type"] = "web";
                if (r.IncludeDomains is not null)
                    b["search_domain_filter"] = JsonSerializer.SerializeToNode(r.IncludeDomains);
                if (r.ExcludeDomains is not null)
                    b["search_domain_filter"] = JsonSerializer.SerializeToNode(r.ExcludeDomains.Select(d => "-" + d));
                break;
            case "parallel":
                b["search_queries"] = new JsonArray(r.Query);
                b["mode"] = "basic";
                var advanced = new JsonObject { ["max_results"] = r.Limit };
                if (r.IncludeDomains is not null || r.ExcludeDomains is not null)
                {
                    var policy = new JsonObject();
                    if (r.IncludeDomains is not null)
                        policy["include_domains"] = JsonSerializer.SerializeToNode(r.IncludeDomains);
                    if (r.ExcludeDomains is not null)
                        policy["exclude_domains"] = JsonSerializer.SerializeToNode(r.ExcludeDomains);
                    advanced["source_policy"] = policy;
                }
                b["advanced_settings"] = advanced;
                break;
            case "linkup":
                b["q"] = r.Query;
                b["depth"] = "fast";
                b["outputType"] = "searchResults";
                b["includeImages"] = false;
                b["maxResults"] = r.Limit;
                Filters("includeDomains", "excludeDomains");
                break;
            case "you":
                b["query"] = r.Query;
                b["count"] = r.Limit;
                Filters("include_domains", "exclude_domains");
                break;
            case "serper":
                b["q"] = r.Query;
                b["num"] = r.Limit;
                break;
            case "serpapi":
                q["engine"] = "google";
                q["q"] = r.Query;
                q["api_key"] = _key!;
                break;
            case "firecrawl":
                b["query"] = r.Query;
                b["limit"] = r.Limit;
                b["sources"] = new JsonArray(new JsonObject { ["type"] = "web" });
                b["highlights"] = false;
                Filters("includeDomains", "excludeDomains");
                break;
            case "valyu":
                if (_valyu is not null)
                    foreach (var (k, v) in JsonSerializer.SerializeToNode(_valyu, Wire.Json)!.AsObject())
                        b[k] = v?.DeepClone();
                b["query"] = r.Query;
                b["search_type"] = "web";
                b["max_num_results"] = r.Limit;
                Filters("included_sources", "excluded_sources");
                break;
            case "searxng":
                q["format"] = "json";
                q["pageno"] = "1";
                q["categories"] = string.Join(',', _searxSettings?.Categories ?? ["general"]);
                q["q"] = r.Query;
                if (_searxSettings?.Language is { } language)
                    q["language"] = language;
                if (_searxSettings?.SafeSearch is { } safe)
                    q["safesearch"] = safe.ToString(System.Globalization.CultureInfo.InvariantCulture);
                if (_searxSettings?.TimeRange is { } range)
                    q["time_range"] = range;
                break;
        }
        if (get && q.Count > 0)
            url += "?" + string.Join('&', q.Select(p => Uri.EscapeDataString(p.Key) + "=" + Uri.EscapeDataString(p.Value)));
        var req = new HttpRequestMessage(get ? HttpMethod.Get : HttpMethod.Post, url);
        if (!get)
            req.Content = Id == "searxng" ? new FormUrlEncodedContent(q) : new StringContent(b.ToJsonString(), System.Text.Encoding.UTF8, "application/json");
        if (!get && Id != "searxng")
            req.Content!.Headers.ContentType = new("application/json");
        if (Id is "tinyfish" or "brave" or "serpapi" or "valyu" or "searxng")
            req.Headers.Accept.ParseAdd("application/json");
        if (Id is "context" or "tavily" or "perplexity" or "linkup" or "firecrawl")
            SearchTransport.Header(req, "Authorization", "Bearer " + _key);
        else if (Id == "brave")
            SearchTransport.Header(req, "X-Subscription-Token", _key!);
        else if (Id is not ("serpapi" or "searxng"))
            SearchTransport.Header(req, "X-API-Key", _key!);
        if (Id == "searxng" && _searxSettings?.Headers is { } headers)
            foreach (var (k, v) in headers)
                SearchTransport.Header(req, k, v);
        return req;
    }
    private SearchResponse Normalize(JsonElement b, int limit)
    {
        Wire.Object(b);
        JsonElement G(string n) => Wire.Get(b, n);
        string? rid = null;
        string? snippet = Id switch
        {
            "context" or "brave" or "you" or "firecrawl" => "description",
            "tavily" or "linkup" or "valyu" or "searxng" => "content",
            "tinyfish" or "perplexity" or "serper" or "serpapi" => "snippet",
            _ => null
        };
        string? highlight = Id == "exa" ? "highlights" : Id == "parallel" ? "excerpts" : Id == "brave" ? "extra_snippets" : null;
        string? score = Id is "exa" or "tavily" or "searxng" ? "score" : Id == "valyu" ? "relevance_score" : null;
        JsonElement rows = G("results");
        SearchUsage? usage = null;
        bool warning = false;
        void Usage(JsonElement source, string field, string unit)
        {
            if (source.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
                return;
            Wire.Object(source);
            var n = Wire.Number(Wire.Get(source, field));
            if (n < 0)
                throw new SearchException("invalid_response");
            if (n is not null)
                usage = new(unit, n.Value);
        }
        bool HasArray(JsonElement e) => e.ValueKind == JsonValueKind.Array && e.GetArrayLength() > 0;
        switch (Id)
        {
            case "context":
                rid = Wire.RequestId(G("request_id"));
                var partial = G("partial");
                if (partial.ValueKind is not (JsonValueKind.Undefined or JsonValueKind.True or JsonValueKind.False))
                    throw new SearchException("invalid_response");
                warning = partial.ValueKind == JsonValueKind.True;
                Usage(G("key_metadata"), "credits_consumed", "credits");
                break;
            case "exa":
                rid = Wire.RequestId(G("requestId"));
                Usage(G("costDollars"), "total", "usd");
                warning = HasArray(G("warnings")) || HasArray(G("notices"));
                break;
            case "tavily":
                rid = Wire.RequestId(G("request_id"));
                Usage(G("usage"), "credits", "credits");
                break;
            case "brave":
                var web = G("web");
                if (web.ValueKind == JsonValueKind.Undefined)
                {
                    if (G("query").ValueKind == JsonValueKind.Object && Wire.Get(G("query"), "original").ValueKind == JsonValueKind.String)
                        rows = JsonSerializer.SerializeToElement(Array.Empty<object>());
                    else
                        throw new SearchException("invalid_response");
                }
                else
                {
                    Wire.Object(web);
                    rows = Wire.Get(web, "results");
                }
                break;
            case "perplexity":
                rid = Wire.RequestId(G("id"));
                break;
            case "parallel":
                rid = Wire.RequestId(G("search_id"));
                if (G("warnings").ValueKind is not (JsonValueKind.Undefined or JsonValueKind.Null or JsonValueKind.Array))
                    throw new SearchException("invalid_response");
                warning = HasArray(G("warnings"));
                break;
            case "you":
                if (G("metadata").ValueKind != JsonValueKind.Undefined)
                {
                    Wire.Object(G("metadata"));
                    rid = Wire.RequestId(Wire.Get(G("metadata"), "search_uuid"));
                }
                Wire.Object(rows);
                if (Wire.Get(rows, "web").ValueKind == JsonValueKind.Undefined)
                {
                    Wire.Array(Wire.Get(rows, "news"));
                    rows = JsonSerializer.SerializeToElement(Array.Empty<object>());
                }
                else
                    rows = Wire.Get(rows, "web");
                break;
            case "serper":
                if (G("error").ValueKind != JsonValueKind.Undefined || G("message").ValueKind != JsonValueKind.Undefined && G("organic").ValueKind == JsonValueKind.Undefined)
                    throw new SearchException("provider_error");
                Usage(b, "credits", "credits");
                rows = G("organic");
                break;
            case "serpapi":
                var meta = G("search_metadata");
                Wire.Object(meta);
                var status = Wire.String(Wire.Get(meta, "status"));
                var info = G("search_information");
                var empty = status == "Success" && G("error").ValueKind == JsonValueKind.String && G("error").GetString() == "Google hasn't returned any results for this query." && Wire.Get(info, "total_results").ValueKind == JsonValueKind.Number && Wire.Get(info, "total_results").TryGetDouble(out var totalResults) && totalResults == 0 && Wire.Get(info, "organic_results_state").ValueKind == JsonValueKind.String && Wire.Get(info, "organic_results_state").GetString() == "Fully empty" && (G("organic_results").ValueKind == JsonValueKind.Undefined || G("organic_results").ValueKind == JsonValueKind.Array && G("organic_results").GetArrayLength() == 0);
                if (G("error").ValueKind != JsonValueKind.Undefined && !empty || status == "Error")
                    throw new SearchException("provider_error");
                if (status != "Success")
                    throw new SearchException("invalid_response");
                rid = Wire.RequestId(Wire.Get(meta, "id"));
                rows = empty ? JsonSerializer.SerializeToElement(Array.Empty<object>()) : G("organic_results");
                break;
            case "firecrawl":
                if (G("success").ValueKind != JsonValueKind.True)
                    throw new SearchException(G("success").ValueKind == JsonValueKind.False ? "provider_error" : "invalid_response");
                rid = Wire.RequestId(G("id"));
                Usage(b, "creditsUsed", "credits");
                if (usage is not null && usage.Value != Math.Truncate(usage.Value))
                    throw new SearchException("invalid_response");
                warning = !string.IsNullOrEmpty(Wire.String(G("warning")));
                Wire.Object(G("data"));
                rows = Wire.Get(G("data"), "web");
                break;
            case "valyu":
                if (G("success").ValueKind is not (JsonValueKind.True or JsonValueKind.False))
                    throw new SearchException("invalid_response");
                if (G("success").ValueKind == JsonValueKind.False)
                    throw new SearchException("provider_error");
                rid = Wire.RequestId(G("tx_id"));
                var valyuError = Wire.String(G("error"));
                var valyuWarnings = Wire.Strings(G("warnings"));
                warning = !string.IsNullOrEmpty(valyuError) || valyuWarnings?.Length > 0;
                Usage(b, "total_deduction_dollars", "usd");
                break;
            case "searxng":
                if (G("error").ValueKind != JsonValueKind.Undefined)
                    throw new SearchException("provider_error");
                if (G("unresponsive_engines").ValueKind is not (JsonValueKind.Undefined or JsonValueKind.Array))
                    throw new SearchException("invalid_response");
                warning = HasArray(G("unresponsive_engines"));
                break;
        }
        var time = TimeProvider.GetUtcNow().ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", System.Globalization.CultureInfo.InvariantCulture);
        var results = Wire.Array(rows).Select(row => { Wire.Object(row); JsonElement R(string n) => Wire.Get(row, n); if (Id == "linkup" && R("type").ValueKind != JsonValueKind.Undefined && Wire.String(R("type")) != "text") throw new SearchException("invalid_response"); var url = Wire.Url(Wire.String(R(Id is "serper" or "serpapi" ? "link" : "url"))); var snip = snippet is null ? null : Wire.String(R(snippet)); if (Id == "you") { var snippets = Wire.Strings(R("snippets")); snip ??= snippets is null ? null : string.Join('\n', snippets); } return new SearchResult(url, new(Id, url, time, rid), Wire.String(R(Id == "linkup" ? "name" : "title")), snip, highlight is null ? null : Wire.Strings(R(highlight)), score is null ? null : Wire.Number(R(score))); }).ToArray();
        return new(Id, results.Take(limit).ToArray(), usage, warning ? [new("provider_warning", Id)] : [], []);
    }
}

/// <summary>Retries and fallbacks are opt-in and can cause repeated provider billing.</summary>
public sealed record SearchPolicy
{
    public TimeSpan Timeout { get; init; } = TimeSpan.FromSeconds(10);
    public TimeSpan? AttemptTimeout
    { get; init; }
    public int Retries
    { get; init; }
    public TimeSpan RetryDelay { get; init; } = TimeSpan.FromMilliseconds(100);
    public IReadOnlySet<string> RetryCodes { get; init; } = new HashSet<string> { "network", "unavailable", "rate_limit", "attempt_timeout" };
    public IReadOnlySet<string> FallbackCodes { get; init; } = new HashSet<string> { "network", "unavailable", "rate_limit", "attempt_timeout", "auth", "provider_error", "invalid_response" };
    public int MaxConcurrency { get; init; } = 4;
}
public sealed class SearchClient : ISearchClient
{
    private readonly NormalizedProvider[] _providers;
    private readonly SearchPolicy _policy;
    private readonly SemaphoreSlim _gate;
    public SearchClient(NormalizedProvider provider, IEnumerable<NormalizedProvider>? fallback = null, SearchPolicy? policy = null)
    {
        _providers = new[] { provider }.Concat(fallback ?? []).ToArray();
        _policy = policy ?? new();
        if (_providers.Any(p => p is null) || _policy.MaxConcurrency is < 1 or > 64 || _policy.Retries is < 0 or > 10 || _policy.RetryDelay < TimeSpan.Zero || _policy.Timeout <= TimeSpan.Zero || _policy.Timeout > TimeSpan.FromDays(1) || _policy.AttemptTimeout <= TimeSpan.Zero || _policy.AttemptTimeout > TimeSpan.FromDays(1))
            throw new SearchException("configuration");
        _gate = new(_policy.MaxConcurrency);
    }
    public async Task<SearchResponse> SearchAsync(SearchRequest request, CancellationToken cancellationToken = default)
    {
        request = (request ?? throw new SearchException("invalid_request")).Validate();
        foreach (var p in _providers)
            p.Capabilities.Validate(request);
        using var scope = new CallScope(_policy.Timeout, cancellationToken);
        var attempts = new List<SearchAttempt>();
        bool entered = false;
        try
        {
            scope.Check();
            await _gate.WaitAsync(scope.Token).ConfigureAwait(false);
            entered = true;
            for (int pi = 0; pi < _providers.Length; pi++)
                for (int ri = 0; ri <= _policy.Retries; ri++)
                {
                    scope.Check();
                    var p = _providers[pi];
                    var started = DateTimeOffset.UtcNow;
                    var clock = Stopwatch.StartNew();
                    using var attempt = CancellationTokenSource.CreateLinkedTokenSource(scope.Token);
                    if (_policy.AttemptTimeout is { } budget)
                        attempt.CancelAfter(budget);
                    try
                    {
                        var result = await p.SearchAsync(request, attempt.Token).WaitAsync(attempt.Token).ConfigureAwait(false);
                        scope.Check();
                        if (_policy.AttemptTimeout is { } completedBudget && clock.Elapsed >= completedBudget)
                            throw new SearchException("attempt_timeout");
                        attempts.Add(new(p.Id, started.ToString("O"), clock.Elapsed.TotalMilliseconds, "success"));
                        return result with
                        {
                            Attempts = attempts.ToArray(),
                            Warnings = result.Warnings.Concat(pi > 0 ? new[] { new SearchWarning("fallback_used", p.Id) } : []).ToArray()
                        };
                    }
                    catch (Exception e)
                    {
                        SearchException failure;
                        try
                        {
                            scope.Check();
                            failure = attempt.IsCancellationRequested || _policy.AttemptTimeout is { } attemptBudget && clock.Elapsed >= attemptBudget ? new SearchException("attempt_timeout") : e as SearchException ?? new SearchException("network");
                        }
                        catch (SearchException stopped) { failure = stopped; }
                        attempts.Add(new(p.Id, started.ToString("O"), clock.Elapsed.TotalMilliseconds, "error", failure.Code, failure.Status, failure.RetryAfterMs));
                        if (failure.Code is "aborted" or "timeout")
                            throw new SearchException(failure.Code, attempts: attempts);
                        if (ri < _policy.Retries && _policy.RetryCodes.Contains(failure.Code))
                        {
                            var delay = Math.Max(_policy.RetryDelay.TotalMilliseconds, failure.RetryAfterMs ?? 0);
                            await Task.Delay(TimeSpan.FromMilliseconds(Math.Min(delay, int.MaxValue)), scope.Token).ConfigureAwait(false);
                            continue;
                        }
                        if (pi + 1 < _providers.Length && _policy.FallbackCodes.Contains(failure.Code))
                            break;
                        throw new SearchException(failure.Code, failure.Status, failure.RetryAfterMs, attempts);
                    }
                }
            throw new SearchException("provider_error", attempts: attempts);
        }
        catch (SearchException e) { try { scope.Check(); } catch (SearchException s) { throw new SearchException(s.Code, attempts: attempts); } throw new SearchException(e.Code, e.Status, e.RetryAfterMs, attempts); }
        catch { try { scope.Check(); } catch (SearchException s) { throw new SearchException(s.Code, attempts: attempts); } throw new SearchException("network", attempts: attempts); }
        finally { if (entered) _gate.Release(); }
    }
}
public static class SearchBatch
{
    public static async Task<IReadOnlyList<BatchOutcome>> SearchBatchAsync(this ISearchClient client, IReadOnlyList<SearchRequest> requests, int concurrency = 4, TimeSpan? timeout = null, CancellationToken cancellationToken = default)
    {
        if (client is null || requests is null || concurrency is < 1 or > 64)
            throw new SearchException("invalid_request");
        using var scope = new CallScope(timeout ?? TimeSpan.FromSeconds(10), cancellationToken);
        var outcomes = new BatchOutcome[requests.Count];
        int next = -1;
        async Task Worker()
        {
            while (true)
            {
                int i = Interlocked.Increment(ref next);
                if (i >= requests.Count)
                    return;
                try
                {
                    scope.Check();
                    var response = await client.SearchAsync(requests[i], scope.Token).WaitAsync(scope.Token).ConfigureAwait(false);
                    scope.Check();
                    outcomes[i] = new(i, response, null);
                }
                catch (Exception e) { SearchException failure; try { scope.Check(); failure = e as SearchException ?? new SearchException("network"); } catch (SearchException s) { failure = s; } outcomes[i] = new(i, null, failure); }
            }
        }
        await Task.WhenAll(Enumerable.Range(0, Math.Min(concurrency, requests.Count)).Select(_ => Worker())).ConfigureAwait(false);
        return outcomes;
    }
}
