using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace SearchSdk;

/// <summary>Open schema objects preserve provider additions without weakening known property types.</summary>
public abstract class NativeModel
{
    [System.Text.Json.Serialization.JsonExtensionData]
    public Dictionary<string, JsonElement>? AdditionalProperties
    { get; set; }
}
public sealed record NativeOperation(string Provider, string Name, string Method, string BaseUrl, string Path, string Mode, string Source)
{
    public bool BodyRequired
    { get; init; }
    public IReadOnlyList<string> RequiredQuery { get; init; } = [];
    public IReadOnlyList<string> RequiredHeaders { get; init; } = [];
    public IReadOnlyList<string> CommaQuery { get; init; } = [];
    public IReadOnlyDictionary<string, string> Headers { get; init; } = System.Collections.Frozen.FrozenDictionary<string, string>.Empty;
    public string? ContentType
    { get; init; }
    public bool HasStream
    { get; init; }
}
public sealed class NativeInput
{
    public object? Path
    { get; init; }
    public object? Query
    { get; init; }
    public object? Body
    { get; init; }
    public IReadOnlyDictionary<string, string>? Headers
    { get; init; }
    public byte[]? RawBody
    { get; init; }
    public string? ContentType
    { get; init; }
    public IReadOnlyList<MultipartPart>? Multipart
    { get; init; }
    public TimeSpan? Timeout
    { get; init; }
}
/// <summary>Materialized upload part. Multipart overhead and all data count against MaxRequestBytes.</summary>
public sealed record MultipartPart(string Name, byte[] Data, string? FileName = null, string ContentType = "application/octet-stream");
public sealed record NativeResponse<T>(T Data, int Status, IReadOnlyDictionary<string, string[]> Headers);

/// <summary>Raw escape hatch over the retained fixed-origin catalog. Never retries or polls, including mutation calls.</summary>
public class NativeClient
{
    private readonly string _provider;
    private readonly string? _key;
    private readonly string? _teamKey;
    protected SearchTransport Transport
    { get; }
    public NativeClient(string provider, string? apiKey, SearchTransport transport, string? teamApiKey = null)
    {
        if (!NativeCatalog.Operations.Any(o => o.Provider == provider))
            throw new SearchException("configuration");
        if (apiKey is not null)
            SearchTransport.Credential(apiKey);
        if (teamApiKey is not null)
            SearchTransport.Credential(teamApiKey);
        _provider = provider;
        _key = apiKey;
        _teamKey = teamApiKey;
        Transport = transport ?? throw new SearchException("configuration");
    }
    public IReadOnlyList<NativeOperation> Operations => NativeCatalog.Operations.Where(o => o.Provider == _provider).ToArray();
    private NativeOperation Find(string operation) => NativeCatalog.Operations.FirstOrDefault(o => o.Provider == _provider && o.Name == operation) ?? throw new SearchException("unsupported_option");
    public Task<NativeResponse<T>> CallAsync<T>(string operation, NativeInput? input = null, CancellationToken cancellationToken = default)
    {
        var op = Find(operation);
        if (op.Mode is "sse" or "embedding-url")
            throw new SearchException("unsupported_option");
        input ??= new();
        return Transport.RunAsync(_ => Task.FromResult(Build(op, input)), raw =>
        {
            try
            {
                object? data = typeof(T) == typeof(RawResponse) ? raw : typeof(T) == typeof(byte[]) ? raw.Body : typeof(T) == typeof(string) ? raw.Text : typeof(T) == typeof(JsonElement) ? raw.Json : JsonSerializer.Deserialize<T>(raw.Body, Wire.Json);
                if (op.Mode == "empty" && raw.Body.Length != 0)
                    throw new SearchException("invalid_response");
                if (data is null && typeof(T) != typeof(JsonElement))
                    throw new SearchException("invalid_response");
                return new NativeResponse<T>((T)data!, raw.Status, raw.Headers);
            }
            catch (SearchException) { throw; }
            catch { throw new SearchException("invalid_response"); }
        }, cancellationToken, input.Timeout);
    }
    public IAsyncEnumerable<ServerSentEvent> StreamAsync(string operation, NativeInput? input = null, CancellationToken cancellationToken = default)
    {
        var op = Find(operation);
        if (op.Mode != "sse")
            throw new SearchException("unsupported_option");
        input ??= new();
        var captured = input;
        return new SingleUseEvents(Transport.StreamAsync(_ => Task.FromResult(Build(op, captured)), input.Timeout, cancellationToken));
    }
    private static JsonObject Obj(object? o)
    {
        if (o is null)
            return new();
        try
        {
            return JsonSerializer.SerializeToNode(o, Wire.Json) as JsonObject ?? throw new SearchException("invalid_request");
        }
        catch { throw new SearchException("invalid_request"); }
    }
    internal static string QueryString(JsonObject query, IReadOnlyList<string> comma)
    {
        var pairs = new List<KeyValuePair<string, string>>();
        string Scalar(JsonNode n)
        {
            var e = JsonSerializer.SerializeToElement(n);
            return e.ValueKind switch
            {
                JsonValueKind.String => e.GetString()!,
                JsonValueKind.Number => e.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                _ => throw new SearchException("invalid_request")
            };
        }
        foreach (var (k, v) in query)
        {
            if (v is null)
                continue;
            if (v is JsonArray a)
            {
                var values = a.Where(x => x is not null).Select(x => Scalar(x!)).ToArray();
                if (comma.Contains(k))
                    pairs.Add(new(k, string.Join(',', values)));
                else
                    pairs.AddRange(values.Select(s => new KeyValuePair<string, string>(k, s)));
            }
            else if (v is JsonObject obj)
            {
                foreach (var (child, n) in obj)
                    if (n is not null)
                        pairs.Add(new(k + "[" + child + "]", Scalar(n)));
            }
            else
                pairs.Add(new(k, Scalar(v)));
        }
        return string.Join('&', pairs.Select(p => Uri.EscapeDataString(p.Key) + "=" + Uri.EscapeDataString(p.Value)));
    }
    private HttpRequestMessage Build(NativeOperation op, NativeInput input)
    {
        var path = Obj(input.Path);
        var query = Obj(input.Query);
        var endpoint = op.BaseUrl.TrimEnd('/') + op.Path;
        foreach (System.Text.RegularExpressions.Match m in System.Text.RegularExpressions.Regex.Matches(endpoint, @"\{([^{}]+)\}"))
        {
            var value = path[m.Groups[1].Value];
            var text = value is JsonValue j && j.TryGetValue<string>(out var s) ? s : null;
            if (string.IsNullOrWhiteSpace(text) || text is "." or ".." || text.Any(char.IsControl))
                throw new SearchException("invalid_request");
            endpoint = endpoint.Replace(m.Value, Uri.EscapeDataString(text));
        }
        if (op.RequiredQuery.Any(n => query[n] is null))
            throw new SearchException("invalid_request");
        if (op.BaseUrl.Contains("logos.context.dev", StringComparison.Ordinal))
        {
            if (query.Any(p => p.Key is not ("publicClientId" or "domain" or "theme" or "type")) || query["publicClientId"] is not JsonValue clientId || !clientId.TryGetValue<string>(out var cid) || string.IsNullOrWhiteSpace(cid) || query["domain"] is not JsonValue domain || !domain.TryGetValue<string>(out var dom) || string.IsNullOrWhiteSpace(dom) || query["theme"] is not null && query["theme"]!.ToJsonString() is not ("\"light\"" or "\"dark\"") || query["type"] is not null && query["type"]!.ToJsonString() is not ("\"icon\"" or "\"wordmark\""))
                throw new SearchException("invalid_request");
        }
        var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (input.Headers is not null)
            foreach (var (k, v) in input.Headers)
                headers[k] = v;
        if (op.RequiredHeaders.Any(n => !headers.ContainsKey(n)))
            throw new SearchException("invalid_request");
        foreach (var forbidden in new[] { "authorization", "x-api-key", "x-subscription-token", "api-key", "x-tavily-access-mode" })
            if (headers.ContainsKey(forbidden))
                throw new SearchException("invalid_request");
        if (_provider == "serpapi")
        {
            if (query.ContainsKey("api_key") || query.ContainsKey("output"))
                throw new SearchException("invalid_request");
            if (op.Name == "google")
            {
                if (query["q"] is not JsonValue q || !q.TryGetValue<string>(out var text) || string.IsNullOrWhiteSpace(text))
                    throw new SearchException("invalid_request");
                query["engine"] = "google";
            }
            if (op.Name is "extract" or "extractMarkdown")
            {
                if (query["url"] is not JsonValue u || !u.TryGetValue<string>(out var text) || string.IsNullOrWhiteSpace(text))
                    throw new SearchException("invalid_request");
                query["engine"] = "extract";
            }
            if (op.Path.StartsWith("/search.", StringComparison.Ordinal) && (query["engine"] is not JsonValue e || !e.TryGetValue<string>(out var engine) || string.IsNullOrWhiteSpace(engine)))
                throw new SearchException("invalid_request");
            if (query["async"]?.ToJsonString() == "true" && query["no_cache"]?.ToJsonString() == "true")
                throw new SearchException("invalid_request");
            if (op.Name is not ("locations" or "uploadImage"))
            {
                SearchTransport.Credential(_key);
                query["api_key"] = _key;
            }
        }
        else if (_provider == "serper" && op.Method == "GET")
        {
            if (query.ContainsKey("apiKey"))
                throw new SearchException("invalid_request");
            SearchTransport.Credential(_key);
            query["apiKey"] = _key;
            headers["X-API-Key"] = _key!;
        }
        else if (op.BaseUrl.Contains("x402.tavily.com", StringComparison.Ordinal))
        {
            if (op.Name == "paidSearch" && !headers.ContainsKey("PAYMENT-SIGNATURE") && !headers.ContainsKey("X-PAYMENT"))
                throw new SearchException("invalid_request");
        }
        else if (op.BaseUrl.Contains("logos.context.dev", StringComparison.Ordinal))
        {
        }
        else
        {
            var key = op.BaseUrl.Contains("admin-api.exa.ai", StringComparison.Ordinal) ? _teamKey : _key;
            if (key is null && _provider == "tavily")
                headers["X-Tavily-Access-Mode"] = "keyless";
            else
            {
                SearchTransport.Credential(key);
                headers[_provider is "context" or "tavily" or "perplexity" or "linkup" or "firecrawl" ? "Authorization" : _provider == "brave" ? "X-Subscription-Token" : "X-API-Key"] = _provider is "context" or "tavily" or "perplexity" or "linkup" or "firecrawl" ? "Bearer " + key : key!;
            }
        }
        foreach (var (k, v) in op.Headers)
            headers[k] = v;
        if (op.Mode == "sse")
            headers["Accept"] = "text/event-stream";
        else
            headers.TryAdd("Accept", op.Mode == "json" ? "application/json" : "*/*");
        var qs = QueryString(query, op.CommaQuery);
        if (qs.Length > 0)
            endpoint += "?" + qs;
        var message = new HttpRequestMessage(new HttpMethod(op.Method), endpoint);
        try
        {
            if (input.Body is not null && (input.RawBody is not null || input.Multipart is not null) || input.RawBody is not null && input.Multipart is not null)
                throw new SearchException("invalid_request");
            if (op.BodyRequired && input.Body is null && input.RawBody is null && input.Multipart is null)
                throw new SearchException("invalid_request");
            if (input.Body is not null)
            {
                var body = JsonSerializer.SerializeToNode(input.Body, Wire.Json);
                if (op.HasStream)
                {
                    if (body is not JsonObject obj)
                        throw new SearchException("invalid_request");
                    var expected = op.Mode == "sse";
                    if (obj["stream"] is not null && obj["stream"]!.ToJsonString() != (expected ? "true" : "false"))
                        throw new SearchException("unsupported_option");
                    obj["stream"] = expected;
                }
                if (_provider == "exa" && op.Name == "searchStream" && (body is not JsonObject exaBody || exaBody["outputSchema"] is null))
                    throw new SearchException("invalid_request");
                if (_provider == "tavily" && op.Name == "paidSearch" && body is JsonObject paidBody && paidBody["search_depth"] is not null && paidBody["search_depth"]!.ToJsonString() != "\"advanced\"")
                    throw new SearchException("unsupported_option");
                var bytes = Encoding.UTF8.GetBytes(body?.ToJsonString() ?? "null");
                if (bytes.Length > Transport.Options.MaxRequestBytes)
                    throw new SearchException("invalid_request");
                message.Content = new ByteArrayContent(bytes);
                message.Content.Headers.ContentType = new("application/json");
            }
            else if (input.Multipart is not null)
            {
                var parts = input.Multipart.ToList();
                if (parts.Count > 128)
                    throw new SearchException("invalid_request");
                if (_provider == "serpapi")
                {
                    if (parts.Any(p => p.Name == "api_key") || !parts.Any(p => p.Name == "image"))
                        throw new SearchException("invalid_request");
                    SearchTransport.Credential(_key);
                    parts.Add(new("api_key", Encoding.UTF8.GetBytes(_key!), null, "text/plain"));
                }
                long length = 0;
                var form = new MultipartFormDataContent();
                message.Content = form;
                foreach (var part in parts)
                {
                    if (string.IsNullOrWhiteSpace(part.Name) || part.Name.Any(c => char.IsControl(c) || c is '"' or '\\') || part.FileName?.Any(c => char.IsControl(c) || c is '"' or '\\') == true || part.Data is null)
                        throw new SearchException("invalid_request");
                    length += part.Data.Length + Encoding.UTF8.GetByteCount(part.Name) + Encoding.UTF8.GetByteCount(part.FileName ?? "") + 256;
                    if (length > Transport.Options.MaxRequestBytes)
                        throw new SearchException("invalid_request");
                    var content = new ByteArrayContent(part.Data);
                    content.Headers.ContentType = new(part.ContentType);
                    if (part.FileName is null)
                        form.Add(content, part.Name);
                    else
                        form.Add(content, part.Name, part.FileName);
                }
            }
            else if (input.RawBody is not null)
            {
                if (input.RawBody.Length > Transport.Options.MaxRequestBytes)
                    throw new SearchException("invalid_request");
                message.Content = new ByteArrayContent(input.RawBody);
                message.Content.Headers.ContentType = new(input.ContentType ?? op.ContentType ?? "application/octet-stream");
            }
            foreach (var (k, v) in headers)
                SearchTransport.Header(message, k, v);
            return message;
        }
        catch (SearchException) { message.Dispose(); throw; }
        catch { message.Dispose(); throw new SearchException("invalid_request"); }
    }
    protected static NativeInput Typed(object? path, object? query, object? body, IReadOnlyDictionary<string, string>? headers, byte[]? raw, IReadOnlyList<MultipartPart>? parts, TimeSpan? timeout, string? contentType = null) => new() { Path = path, Query = query, Body = body, Headers = headers, RawBody = raw, Multipart = parts, Timeout = timeout, ContentType = contentType };
}

internal sealed class SingleUseEvents(IAsyncEnumerable<ServerSentEvent> source) : IAsyncEnumerable<ServerSentEvent>
{
    private int _used;
    public IAsyncEnumerator<ServerSentEvent> GetAsyncEnumerator(CancellationToken cancellationToken = default)
    {
        if (Interlocked.Exchange(ref _used, 1) != 0)
            throw new SearchException("invalid_request");
        return source.GetAsyncEnumerator(cancellationToken);
    }
}
