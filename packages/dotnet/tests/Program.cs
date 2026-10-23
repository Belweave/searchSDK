using SearchSdk;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;

static class Test
{
    static int _assertions; static int _groups;
    static readonly string Fixtures = Path.Combine(AppContext.BaseDirectory, "fixtures");
    static readonly JsonSerializerOptions Json = Wire.Json;
    static JsonElement Fixture(string name) => JsonDocument.Parse(File.ReadAllText(Path.Combine(Fixtures, name + ".json"))).RootElement.Clone();
    static void Assert(bool condition, string message) { _assertions++; if (!condition) throw new Exception(message); }
    static void Equal(object? a, object? b, string message) => Assert(JsonNode.DeepEquals(JsonSerializer.SerializeToNode(a, Json), JsonSerializer.SerializeToNode(b, Json)), message + "\nactual: " + JsonSerializer.Serialize(a, Json) + "\nexpected: " + JsonSerializer.Serialize(b, Json));
    static async Task<SearchException> Error(string code, Func<Task> action) { try { await action(); } catch (SearchException e) { Assert(e.Code == code, $"Expected {code}, got {e.Code}"); Assert(e.InnerException is null, "No inner transport exception"); Assert(!e.ToString().Contains("top-secret", StringComparison.Ordinal), "Credential non-disclosure"); return e; } throw new Exception("Expected " + code); }
    static HttpResponseMessage Response(string text, int status = 200) => new((HttpStatusCode)status) { Content = new StringContent(text, Encoding.UTF8, "application/json") };
    static HttpContent EventContent(Stream stream) { var c = new StreamContent(stream); c.Headers.ContentType = new("text/event-stream"); return c; }
    static HttpResponseMessage Success() => Response(Fixture("search-success").GetRawText());
    static SearchTransport Transport(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler, TransportOptions? options = null) => new(options, new Handler(handler));
    static Task<HttpResponseMessage> Ready(HttpResponseMessage r) => Task.FromResult(r);
    static Dictionary<string, string> Query(string text) => text.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries).Select(p => p.Split('=', 2)).ToDictionary(p => Uri.UnescapeDataString(p[0].Replace('+', ' ')), p => p.Length == 2 ? Uri.UnescapeDataString(p[1].Replace('+', ' ')) : "");
    static async Task Group(string name, Func<Task> action) { await action(); _groups++; Console.WriteLine("PASS " + name); }
    public static async Task Main()
    {
        await Group("shared request cases", async () =>
        {
            var cases = Fixture("request-cases");
            foreach (var c in cases.GetProperty("valid").EnumerateArray())
                Equal(SearchRequest.FromJson(c.GetProperty("input")), c.GetProperty("normalized"), c.GetProperty("name").GetString()!);
            foreach (var c in cases.GetProperty("invalid").EnumerateArray())
                await Error("invalid_request", () => { SearchRequest.FromJson(c.GetProperty("input")); return Task.CompletedTask; });
        });
        await Group("all 24 provider wire/normalization fixtures", async () =>
        {
            var fixture = Fixture("providers");
            int count = 0;
            foreach (var c in fixture.GetProperty("cases").EnumerateArray())
            {
                HttpRequestMessage? captured = null;
                string? body = null;
                using var transport = Transport(async (r, ct) => { captured = r; body = r.Content is null ? null : await r.Content.ReadAsStringAsync(ct); return Response(c.GetProperty("upstreamResponse").GetRawText()); });
                var provider = c.GetProperty("provider").GetString()!;
                var p = new NormalizedProvider(provider, provider == "searxng" ? null : "fixture-key", transport, provider == "searxng" ? "https://searxng.example" : null) { TimeProvider = new FixedTime() };
                var actual = await p.SearchAsync(SearchRequest.FromJson(c.GetProperty("request")));
                var wire = c.GetProperty("upstreamRequest");
                Equal(captured!.Method.Method, wire.GetProperty("method"), "method " + provider);
                Equal(captured.RequestUri!.GetLeftPart(UriPartial.Path), wire.GetProperty("url"), "URL " + provider);
                Equal(Query(captured.RequestUri.Query), wire.GetProperty("query"), "query " + provider);
                foreach (var h in wire.GetProperty("headers").EnumerateObject())
                { var val = h.Name == "content-type" ? captured.Content!.Headers.ContentType!.ToString() : string.Join(", ", captured.Headers.GetValues(h.Name)); Equal(val, h.Value, "header " + provider + " " + h.Name); }
                if (body is null)
                    Assert(wire.GetProperty("body").ValueKind == JsonValueKind.Null, "no body");
                else if (provider == "searxng")
                    Equal(Query(body), wire.GetProperty("body"), "form body");
                else
                    Equal(JsonNode.Parse(body), wire.GetProperty("body"), "JSON body " + provider);
                var expected = c.GetProperty("response");
                Equal(actual.Results, expected.GetProperty("results"), "results " + provider);
                Equal(actual.Usage, expected.GetProperty("usage"), "usage " + provider);
                Equal(actual.Warnings, expected.GetProperty("warnings"), "warnings " + provider);
                var caps = c.GetProperty("capabilities");
                Assert(p.Capabilities.DomainFilters == caps.GetProperty("domainFilters").GetBoolean(), "capability domains");
                Assert(p.Capabilities.MaxIncludeDomains == caps.GetProperty("maxIncludeDomains").GetInt32(), "include capacity");
                Assert(p.Capabilities.MaxExcludeDomains == caps.GetProperty("maxExcludeDomains").GetInt32(), "exclude capacity");
                count++;
            }
            Assert(count == 24, "24 fixture cases");
        });
        await Group("gateway success/errors/wire/token", async () =>
        {
            string? body = null, token = null;
            int calls = 0;
            using var t = Transport(async (r, ct) => { calls++; body = await r.Content!.ReadAsStringAsync(ct); token = r.Headers.Authorization?.ToString(); var response = Success(); response.Headers.Add("X-SearchSDK-Protocol", "1"); return response; });
            var client = new GatewayClient("https://gateway.example/exact", t, _ => ValueTask.FromResult<string?>("top-secret"));
            var result = await client.SearchAsync(new("hello", 2, ["EXAMPLE.COM"]));
            Assert(result.Results.Count == 1, "gateway results");
            Assert(token == "Bearer top-secret", "app auth");
            Equal(JsonNode.Parse(body!), new { query = "hello", limit = 2, includeDomains = new[] { "example.com" } }, "gateway request");
            Assert(calls == 1, "single gateway POST");
            foreach (var c in Fixture("search-errors").EnumerateArray())
            { using var e = Transport((_, _) => Ready(Response(c.GetProperty("body").GetRawText(), c.GetProperty("httpStatus").GetInt32()))); await Error(c.GetProperty("body").GetProperty("error").GetProperty("code").GetString()!, () => new GatewayClient("https://gateway.example/exact", e).SearchAsync(new("x"))); }
            foreach (var status in new[] { 401, 402, 403, 432, 433, 429, 408, 500, 503, 404, 400 })
            { using var e = Transport((_, _) => Ready(Response("top-secret", status))); await Error(status is 401 or 402 or 403 or 432 or 433 ? "auth" : status == 429 ? "rate_limit" : status == 408 || status >= 500 ? "unavailable" : "provider_error", () => new GatewayClient("https://gateway.example", e).SearchAsync(new("top-secret"))); }
            foreach (var endpoint in new[] { "http://gateway.example", "https://user:top-secret@gateway.example", "https://gateway.example?x=1", "https://gateway.example#f", "https://gateway.example?", "https://gateway.example/#", "https://gateway.example\\x" })
                await Error("configuration", () => { new GatewayClient(endpoint, t); return Task.CompletedTask; });
        });
        await Group("malformed gateway fields and protocol", async () =>
        {
            var changes = new Action<JsonObject>[] { n => n.Remove("usage"), n => n["provider"] = "bad provider", n => n["usage"] = new JsonObject { ["unit"] = "credits", ["value"] = -1 }, n => n["warnings"] = new JsonArray(new JsonObject { ["code"] = "unknown", ["provider"] = "x" }), n => n["reuse"] = "unknown", n => n["results"]![0]!["url"] = "https://top-secret@example.com/", n => n["results"]![0]!["url"] = "javascript:alert(1)", n => n["results"]![0]!["score"] = "NaN", n => n["results"]![0]!["highlights"] = new JsonArray(3), n => n["results"]![0]!["provenance"]!["retrievedAt"] = "not-a-date", n => n["results"]![0]!["provenance"]!["retrievedAt"] = "2026-02-31T00:00:00Z", n => n["results"]![0]!["provenance"]!["requestId"] = "top-secret\n", n => n["attempts"]![0]!["durationMs"] = -1, n => n["attempts"]![0]!["status"] = 200.5, n => n["attempts"]![0]!["retryAfterMs"] = -1, n => n["attempts"]![0]!["startedAt"] = "26-01-01", n => n["attempts"]![0]!["code"] = "unknown" };
            foreach (var change in changes)
            { var n = JsonNode.Parse(Fixture("search-success").GetRawText())!.AsObject(); change(n); using var t = Transport((_, _) => Ready(Response(n.ToJsonString()))); await Error("invalid_response", () => new GatewayClient("https://gateway.example", t).SearchAsync(new("x"))); }
            foreach (var version in new[] { "2", "1, 2", "" })
            { using var t = Transport((_, _) => { var r = Success(); r.Headers.TryAddWithoutValidation("X-SearchSDK-Protocol", version); return Ready(r); }); await Error("invalid_response", () => new GatewayClient("https://gateway.example", t).SearchAsync(new("x"))); }
            foreach (var text in new[] { "[]", "null", "{}", "{bad", "{\"provider\":\"top-secret\"}" })
            { using var t = Transport((_, _) => Ready(Response(text))); await Error("invalid_response", () => new GatewayClient("https://gateway.example", t).SearchAsync(new("x"))); }
        });
        await Group("provider response validation/capabilities", async () =>
        {
            foreach (var id in new[] { "context", "tinyfish", "exa", "tavily", "brave", "perplexity", "parallel", "linkup", "you", "serper", "serpapi", "firecrawl", "valyu", "searxng" })
            {
                using var t = Transport((_, _) => Ready(Response("{}")));
                var p = new NormalizedProvider(id, id == "searxng" ? null : "top-secret", t, id == "searxng" ? "https://searxng.example" : null);
                await Error("invalid_response", () => p.SearchAsync(new("x")));
                if (!p.Capabilities.DomainFilters)
                    await Error("unsupported_option", () => p.SearchAsync(new("x", 5, ["example.com"])));
                else
                { await Error("unsupported_option", () => p.SearchAsync(new("x", 5, Enumerable.Range(0, p.Capabilities.MaxIncludeDomains + 1).Select(i => $"x{i}.com").ToArray()))); if (p.Capabilities.MutuallyExclusiveDomainFilters) await Error("unsupported_option", () => p.SearchAsync(new("x", 5, ["example.com"], ["other.com"]))); }
            }
            foreach (var text in new[] { "{\"results\":[{\"url\":\"https://top-secret@example.com\"}]}", "{\"results\":[{\"url\":\"https://example.com\",\"score\":\"NaN\"}]}", "{\"results\":[],\"costDollars\":{\"total\":-1}}" })
            { using var t = Transport((_, _) => Ready(Response(text))); await Error("invalid_response", () => new NormalizedProvider("exa", "top-secret", t).SearchAsync(new("x"))); }
            using var empty = Transport((_, _) => Ready(Response("{\"query\":{\"original\":\"q\"}}")));
            Assert((await new NormalizedProvider("brave", "key", empty).SearchAsync(new("q"))).Results.Count == 0, "Brave empty section");
        });
        await Group("deadlines/cancellation include queues/token lookup/body", async () =>
        {
            var shortOptions = new TransportOptions { Timeout = TimeSpan.FromMilliseconds(70), MaxConcurrency = 1 };
            using (var t = Transport((_, _) => new TaskCompletionSource<HttpResponseMessage>().Task, shortOptions))
            { var c = new GatewayClient("https://gateway.example", t); var watch = Stopwatch.StartNew(); await Error("timeout", () => c.SearchAsync(new("top-secret"))); Assert(watch.Elapsed < TimeSpan.FromSeconds(2), "uncooperative transport bounded"); using var cancel = new CancellationTokenSource(); cancel.Cancel(); await Error("aborted", () => c.SearchAsync(new("x"), cancel.Token)); }
            using (var t = Transport((_, _) => Ready(Success()), shortOptions))
            { int dispatch = 0; var c = new GatewayClient("https://gateway.example", t, _ => { Interlocked.Increment(ref dispatch); return new ValueTask<string?>(new TaskCompletionSource<string?>().Task); }); var a = Error("timeout", () => c.SearchAsync(new("a"))); using var queuedCancel = new CancellationTokenSource(20); var b = Error("aborted", () => c.SearchAsync(new("b"), queuedCancel.Token)); await Task.WhenAll(a, b); Assert(dispatch == 1, "queued request expired before token lookup"); }
            using (var t = Transport((_, _) => Ready(new HttpResponseMessage(HttpStatusCode.OK) { Content = EventContent(new HangingStream()) }), shortOptions))
                await Error("timeout", () => new GatewayClient("https://gateway.example", t).SearchAsync(new("x")));
            using (var t = Transport(async (_, ct) => { await Task.Delay(1000, ct); return Success(); }, new() { Timeout = TimeSpan.FromSeconds(2) }))
            { using var cts = new CancellationTokenSource(30); await Error("aborted", () => new GatewayClient("https://gateway.example", t).SearchAsync(new("x"), cts.Token)); }
        });
        await Group("decoded response limits/redirects/secret failures", async () =>
        {
            foreach (var content in new HttpContent[] { new ByteArrayContent(new byte[200]), new StreamContent(new MemoryStream(new byte[200])) })
            { using var t = Transport((_, _) => Ready(new HttpResponseMessage(HttpStatusCode.OK) { Content = content }), new() { MaxResponseBytes = 100 }); await Error("invalid_response", () => new GatewayClient("https://gateway.example", t).SearchAsync(new("x"))); }
            foreach (var s in new[] { 301, 302, 303, 307, 308 })
            { int calls = 0; using var t = Transport((_, _) => { calls++; var r = Response("top-secret", s); r.Headers.Location = new Uri("https://other.example"); return Ready(r); }); await Error("provider_error", () => new GatewayClient("https://gateway.example", t, _ => ValueTask.FromResult<string?>("top-secret")).SearchAsync(new("top-secret"))); Assert(calls == 1, "redirect never followed"); }
            using (var t = Transport((_, _) => throw new Exception("top-secret")))
                await Error("network", () => new NormalizedProvider("exa", "top-secret", t).SearchAsync(new("top-secret")));
            using (var t = Transport((_, _) => Ready(Response("top-secret", 401))))
            { var e = await Error("auth", () => new NativeClient("serpapi", "top-secret", t).CallAsync<JsonElement>("search", new() { Query = new { engine = "google", q = "top-secret" } })); Assert(e.Status == 401, "sanitized status"); }
        });
        await Group("explicit retry/fallback and bounded ordered batches", async () =>
        {
            int calls = 0;
            using var t = Transport((r, _) => { calls++; if (calls == 1) { var e = Response("top-secret", 429); e.Headers.TryAddWithoutValidation("Retry-After", "0.03"); return Ready(e); } return Ready(Response("{\"results\":[]}")); });
            var p = new NormalizedProvider("exa", "top-secret", t);
            var c = new SearchClient(p, policy: new() { Retries = 1, RetryDelay = TimeSpan.Zero });
            var watch = Stopwatch.StartNew();
            var result = await c.SearchAsync(new("x"));
            Assert(calls == 2 && result.Attempts.Count == 2, "one opted-in retry");
            Assert(watch.ElapsedMilliseconds >= 20, "Retry-After lower bound");
            calls = 0;
            using var f = Transport((r, _) => { calls++; return Ready(r.RequestUri!.Host.Contains("exa") ? Response("secret", 503) : Response("{\"results\":[]}")); });
            var fallback = new SearchClient(new("exa", "key", f), [new("tavily", "key", f)]);
            result = await fallback.SearchAsync(new("x"));
            Assert(result.Provider == "tavily" && result.Warnings.Any(w => w.Code == "fallback_used") && result.Attempts.Count == 2, "explicit fallback");
            calls = 0;
            using var none = Transport((_, _) => { calls++; return Ready(Response("secret", 503)); });
            await Error("unavailable", () => new SearchClient(new("exa", "key", none)).SearchAsync(new("x")));
            Assert(calls == 1, "no implicit retry");
            using var attempt = Transport((_, _) => new TaskCompletionSource<HttpResponseMessage>().Task);
            await Error("attempt_timeout", () => new SearchClient(new("exa", "key", attempt), policy: new() { AttemptTimeout = TimeSpan.FromMilliseconds(30) }).SearchAsync(new("x")));
            var client = new BatchClient();
            var outcomes = await client.SearchBatchAsync([new("a"), new("bad"), new("c"), new("d")], 2);
            Assert(client.Maximum <= 2, "bounded batch concurrency");
            Assert(outcomes.Select(o => o.Index).SequenceEqual(new[] { 0, 1, 2, 3 }), "batch ordering");
            Assert(!outcomes[1].IsSuccess && outcomes[0].IsSuccess && outcomes[2].IsSuccess, "failed item preserves siblings");
            using var slow = Transport((_, _) => new TaskCompletionSource<HttpResponseMessage>().Task);
            var queued = await new GatewayClient("https://gateway.example", slow).SearchBatchAsync([new("a"), new("b"), new("c")], 1, TimeSpan.FromMilliseconds(30));
            Assert(queued.All(o => o.Error?.Code == "timeout"), "whole batch includes queued items");
        });
        await Group("Valyu and SearXNG supported settings", async () =>
        {
            string? body = null;
            HttpRequestMessage? captured = null;
            using var t = Transport(async (r, ct) => { captured = r; body = await r.Content!.ReadAsStringAsync(ct); return Response(r.RequestUri!.Host.Contains("valyu") ? "{\"success\":true,\"results\":[]}" : "{\"results\":[]}"); });
            var valyu = new NormalizedProvider("valyu", "key", t, valyu: new() { MaxPrice = 0.5, RelevanceThreshold = 0.4, ResponseLength = NativeUnion<string, long>.FromFirst("short"), FastMode = true, StartDate = "2026-01-01", EndDate = "2026-10-22", Instructions = "Find references" });
            await valyu.SearchAsync(new("q"));
            var v = JsonNode.Parse(body!)!;
            Assert(v["max_price"]!.GetValue<double>() == 0.5 && v["fast_mode"]!.GetValue<bool>() && v["search_type"]!.GetValue<string>() == "web", "Valyu settings wire");
            var searx = new NormalizedProvider("searxng", null, t, "https://operator.example/base/", searxng: new() { Language = "en-US", SafeSearch = 2, TimeRange = "year", Categories = ["general", "science"], Headers = new Dictionary<string, string> { ["Authorization"] = "Bearer app-token" } });
            await searx.SearchAsync(new("q"));
            var form = Query(body!);
            Assert(form["safesearch"] == "2" && form["categories"] == "general,science" && form["language"] == "en-US" && captured!.RequestUri!.AbsolutePath == "/base/search", "SearXNG settings/base path");
            foreach (var settings in new ValyuSearchOptions[] { new() { MaxPrice = double.NaN }, new() { MaxPrice = 0 }, new() { RelevanceThreshold = 1.1 }, new() { StartDate = "2026-02-31" }, new() { StartDate = "2026-10-22", EndDate = "2026-01-01" }, new() { ResponseLength = NativeUnion<string, long>.FromSecond(0) }, new() { Instructions = " " } })
                await Error("configuration", () => { new NormalizedProvider("valyu", "key", t, valyu: settings); return Task.CompletedTask; });
            await Error("configuration", () => { new NormalizedProvider("searxng", null, t, "https://operator.example", searxng: new() { Headers = new Dictionary<string, string> { ["Cookie"] = "top-secret" } }); return Task.CompletedTask; });
        });
        await Group("monotonic budgets, attempt provenance and strict optional metadata", async () =>
        {
            using (var t = Transport((_, _) => new TaskCompletionSource<HttpResponseMessage>().Task))
            {
                var client = new SearchClient(new("exa", "key", t), policy: new() { Timeout = TimeSpan.FromMilliseconds(25) });
                var e = await Error("timeout", () => client.SearchAsync(new("q")));
                Assert(e.Attempts.Count == 1 && e.Attempts[0].Code == "timeout" && e.Attempts[0].Outcome == "error", "total timeout records active attempt");
                using var cts = new CancellationTokenSource(25);
                e = await Error("aborted", () => new SearchClient(new("exa", "key", t)).SearchAsync(new("q"), cts.Token));
                Assert(e.Attempts.Count == 1 && e.Attempts[0].Code == "aborted", "caller cancellation records active attempt");
            }
            using (var t = Transport((_, _) => { Thread.Sleep(45); return Ready(Response("{\"results\":[]}")); }, new() { Timeout = TimeSpan.FromMilliseconds(15) }))
                await Error("timeout", () => new NormalizedProvider("exa", "key", t).SearchAsync(new("q")));
            foreach (var field in new[] { "code", "status", "retryAfterMs", "reuse" })
            { var node = JsonNode.Parse(Fixture("search-success").GetRawText())!; if (field == "reuse") node[field] = null; else node["attempts"]![0]![field] = null; using var t = Transport((_, _) => Ready(Response(node.ToJsonString()))); await Error("invalid_response", () => new GatewayClient("https://gateway.example", t).SearchAsync(new("q"))); }
            using (var t = Transport((_, _) => Ready(Response("{\"search_metadata\":{\"status\":\"Success\"},\"error\":123}"))))
                await Error("provider_error", () => new NormalizedProvider("serpapi", "key", t).SearchAsync(new("q")));
            using (var t = Transport((_, _) => Ready(Response("{\"success\":true,\"results\":[],\"error\":\"warning\",\"warnings\":[123]}"))))
                await Error("invalid_response", () => new NormalizedProvider("valyu", "key", t).SearchAsync(new("q")));
        });
        await NativeTests();
        await LoopbackTests();
        Console.WriteLine($"PASS {_groups} groups, {_assertions} assertions; no external/provider requests.");
    }
    static async Task NativeTests()
    {
        await Group("493 native identities/fixed origins/methods/headers/modes", async () =>
        {
            Assert(NativeCatalog.Operations.Count == 493, "493 operations");
            Assert(NativeCatalog.Operations.Select(o => o.Provider).Distinct().Count() == 13, "13 native providers");
            Assert(NativeCatalog.Operations.Select(o => o.Provider + "." + o.Name).Distinct().Count() == 493, "unique operation names");
            var assembly = typeof(NativeClient).Assembly;
            int calls = 0;
            string activeMode = "";
            HttpRequestMessage? captured = null;
            string? body = null;
            using var t = Transport(async (r, ct) => { calls++; captured = r; body = r.Content is null ? null : await r.Content.ReadAsStringAsync(ct); return r.Headers.Accept.Any(a => a.MediaType == "text/event-stream") ? new HttpResponseMessage(HttpStatusCode.OK) { Content = EventContent(new ChunkStream(Encoding.UTF8.GetBytes("data: fixture\n\n"), 1)) } : Response(activeMode == "empty" ? "" : "{}"); });
            foreach (var op in NativeCatalog.Operations)
            {
                activeMode = op.Mode;
                string title = op.Provider == "serpapi" ? "SerpApi" : char.ToUpperInvariant(op.Provider[0]) + op.Provider[1..];
                var type = assembly.GetType("SearchSdk." + title + "Client")!;
                Assert(type is not null, "named provider client");
                string method = char.ToUpperInvariant(op.Name[0]) + op.Name[1..] + (op.Mode == "embedding-url" ? "" : "Async");
                Assert(type!.GetMethod(method) is not null, "named operation " + op.Provider + "." + op.Name);
                Assert(Uri.TryCreate(op.Source, UriKind.Absolute, out _), "official attribution");
                if (op.Mode == "embedding-url")
                    continue;
                var path = System.Text.RegularExpressions.Regex.Matches(op.Path, @"\{([^{}]+)\}").Select(m => m.Groups[1].Value).ToDictionary(n => n, _ => "fixture/space value");
                var query = op.RequiredQuery.ToDictionary(n => n, _ => (object)"fixture");
                if (op.Provider == "serpapi" && op.Path.StartsWith("/search."))
                { query["engine"] = "google"; query["q"] = "fixture"; query["url"] = "https://example.org"; }
                if (op.Provider == "context" && op.Name == "headLogo")
                { query["publicClientId"] = "public"; query["domain"] = "example.org"; }
                var headers = op.RequiredHeaders.ToDictionary(n => n, _ => "fixture");
                if (op.Name == "paidSearch")
                    headers["PAYMENT-SIGNATURE"] = "externally-supplied";
                var input = new NativeInput { Path = path, Query = query, Headers = headers, Body = op.BodyRequired && op.ContentType is null ? (object)(op.Provider == "exa" && op.Name == "searchStream" ? new { outputSchema = new { type = "object" } } : new { }) : null, RawBody = op.BodyRequired && op.ContentType is not null && op.Provider != "serpapi" ? Encoding.UTF8.GetBytes("fixture") : null, Multipart = op.Provider == "serpapi" && op.Name == "uploadImage" ? [new("image", [1, 2, 3], "fixture.png", "image/png")] : null };
                var native = new NativeClient(op.Provider, "fixture-key", t, "team-key");
                int before = calls;
                if (op.Mode == "sse")
                { int events = 0; await foreach (var e in native.StreamAsync(op.Name, input)) { Assert(e.Data == "fixture", "SSE event"); events++; } Assert(events == 1, "SSE dispatch"); }
                else
                    await native.CallAsync<RawResponse>(op.Name, input);
                Assert(calls == before + 1, "single native call, no implicit mutation retry");
                Assert(captured!.Method.Method == op.Method, "native HTTP verb");
                Assert(captured.RequestUri!.GetLeftPart(UriPartial.Authority) == new Uri(op.BaseUrl).GetLeftPart(UriPartial.Authority), "fixed native origin");
                Assert(!captured.Headers.Contains("Cookie") && !captured.Headers.Contains("Proxy-Authorization"), "no ambient HTTP auth");
                if (op.BaseUrl.Contains("logos.context.dev") || op.BaseUrl.Contains("x402.tavily.com"))
                    Assert(!captured.Headers.Contains("Authorization") && !captured.Headers.Contains("X-API-Key"), "public/payment host does not get provider key");
                if (!op.BaseUrl.Contains("logos.context.dev") && !op.BaseUrl.Contains("x402.tavily.com") && op.Provider != "serpapi")
                {
                    var authHeader = op.Provider is "context" or "tavily" or "perplexity" or "linkup" or "firecrawl" ? "Authorization" : op.Provider == "brave" ? "X-Subscription-Token" : "X-API-Key";
                    var key = op.BaseUrl.Contains("admin-api.exa.ai") ? "team-key" : "fixture-key";
                    var expectedAuth = authHeader == "Authorization" ? "Bearer " + key : key;
                    Assert(captured.Headers.GetValues(authHeader).Single() == expectedAuth, "exact native authentication " + op.Provider + "." + op.Name);
                }
                if (op.Provider == "serper" && op.Method == "GET")
                    Assert(Query(captured.RequestUri.Query)["apiKey"] == "fixture-key", "Serper GET query credential");
                if (op.BaseUrl.Contains("admin-api.exa.ai"))
                    Assert(captured.Headers.GetValues("X-API-Key").Single() == "team-key", "separate Exa team credential");
                foreach (var name in path.Keys)
                    Assert(captured.RequestUri.AbsoluteUri.Contains(Uri.EscapeDataString(path[name]), StringComparison.Ordinal), "escaped native path");
                if (op.HasStream && input.Body is not null)
                    Assert(JsonNode.Parse(body!)!["stream"]!.GetValue<bool>() == (op.Mode == "sse"), "stream variant wire selector");
            }
        });
        await Group("typed native wire models/unions/unknown fields", async () =>
        {
            string? sent = null;
            using var t = Transport(async (r, ct) => { sent = await r.Content!.ReadAsStringAsync(ct); return Response("{\"query\":\"q\",\"answer\":null,\"images\":[],\"response_time\":0.1,\"results\":[],\"new_provider_field\":{\"nested\":[1,2]},\"response_time\":0.1}"); });
            var client = new TavilyClient("key", t);
            var response = await client.SearchAsync(new() { Body = new() { Query = "q", MaxResults = 3, IncludeAnswer = NativeUnion<bool, string>.FromSecond("advanced"), AdditionalProperties = new() { ["future_input"] = JsonSerializer.SerializeToElement(true) } } });
            Assert(response.Data.Query == "q", "typed native response");
            Assert(response.Data.AdditionalProperties!["new_provider_field"].GetProperty("nested").GetArrayLength() == 2, "unknown response retained");
            var n = JsonNode.Parse(sent!)!;
            Assert(n["include_answer"]!.GetValue<string>() == "advanced" && n["future_input"]!.GetValue<bool>(), "typed union/input extension wire");
            using var s = Transport((_, _) => Ready(Response("[{\"organic\":[],\"credits\":1}]")));
            var serper = new SerperClient("key", s);
            var batch = await serper.SearchAsync(new() { Body = NativeUnion<SerperSchemaSearchRequest, List<SerperSchemaSearchRequest>>.FromSecond([new() { Q = "q" }]) });
            Assert(batch.Data.TryGetSecond(out var values) && values!.Count == 1 && values[0].Credits == 1, "typed array union result");
            using var bad = Transport((_, _) => Ready(Response("{\"results\":\"malformed\"}")));
            await Error("invalid_response", () => new TavilyClient("key", bad).SearchAsync(new() { Body = new() { Query = "q" } }));
            using var empty = Transport((_, _) => Ready(Response("{\"results\":\"malformed\"}")));
            await Error("invalid_response", () => new ExaClient("key", empty).GetContentsAsync(new() { Body = new() { Ids = ["https://example.org"] } }));
            var future = JsonSerializer.Deserialize<NativeUnion<string, long>>("{\"future\":true}", Json)!;
            Assert(future.Raw.GetProperty("future").GetBoolean() && !future.TryGetFirst(out _), "unknown union variant remains raw");
        });
        await Group("native logo/payment/parameter guards/multipart/modes", async () =>
        {
            HttpRequestMessage? captured = null;
            string? body = null;
            using var t = Transport(async (r, ct) => { captured = r; body = r.Content is null ? null : await r.Content.ReadAsStringAsync(ct); return Response("{\"query\":\"q\",\"answer\":null,\"images\":[],\"response_time\":0.1,\"results\":[]}"); });
            var context = new ContextClient(null, t);
            var logo = context.LogoUrl(new() { Query = new() { PublicClientId = "public client", Domain = "example.org", Theme = "dark", Type = "icon" } });
            Assert(logo.Contains("publicClientId=public%20client") && logo.StartsWith("https://logos.context.dev/", StringComparison.Ordinal), "logo embedding URL");
            await context.HeadLogoAsync(new() { Query = new() { PublicClientId = "public", Domain = "example.org" } });
            Assert(captured!.Method == HttpMethod.Head && !captured.Headers.Contains("Authorization"), "public logo HEAD");
            await Error("invalid_request", () => { context.LogoUrl(new() { Query = new() { PublicClientId = "id", Domain = "example.org", Theme = "unknown" } }); return Task.CompletedTask; });
            var tavily = new TavilyClient(null, t);
            await tavily.PaidSearchAsync(new() { Body = new() { Query = "q" }, Headers = new Dictionary<string, string> { ["PAYMENT-SIGNATURE"] = "external-proof" } });
            Assert(captured!.RequestUri!.Host == "x402.tavily.com" && !captured.Headers.Contains("Authorization"), "x402 isolated host");
            Assert(captured.Headers.GetValues("PAYMENT-SIGNATURE").Single() == "external-proof", "external payment forwarded");
            await tavily.GetPaymentPricingAsync(new());
            Assert(captured.RequestUri.AbsolutePath == "/.well-known/pricing", "payment pricing raw");
            foreach (var header in new[] { "Authorization", "Cookie", "Host", "Proxy-Authorization", "X-API-Key", "Connection", "Transfer-Encoding", "Content-Length" })
                await Error("invalid_request", () => new NativeClient("exa", "top-secret", t).CallAsync<RawResponse>("search", new() { Body = new { query = "q" }, Headers = new Dictionary<string, string> { [header] = "top-secret" } }));
            await Error("invalid_request", () => new NativeClient("exa", "key", t).CallAsync<RawResponse>("search", new() { Body = new { }, Headers = new Dictionary<string, string> { ["X-Test"] = "top-secret\r\nInjected: 1" } }));
            await Error("invalid_request", () => new NativeClient("serpapi", "key", t).CallAsync<RawResponse>("search", new() { Query = new { engine = "google", api_key = "top-secret" } }));
            await Error("invalid_request", () => new NativeClient("serpapi", "key", t).CallAsync<RawResponse>("search", new() { Query = new { engine = "google", @async = true, no_cache = true } }));
            await Error("invalid_request", () => new NativeClient("exa", "key", t).CallAsync<RawResponse>("getWebset", new() { Path = new { id = ".." } }));
            await new SerpApiClient("key", t).UploadImageAsync(new() { Multipart = [new("image", [1, 2, 3], "image.png", "image/png")] });
            Assert(body!.Contains("name=api_key", StringComparison.Ordinal) && body.Contains("key", StringComparison.Ordinal), "multipart provider key injection");
            using var small = Transport((_, _) => Ready(Response("{}")), new() { MaxRequestBytes = 100 });
            await Error("invalid_request", () => new NativeClient("serpapi", "top-secret", small).CallAsync<RawResponse>("uploadImage", new() { Multipart = [new("image", new byte[200], "x.png")] }));
            using var text = Transport((_, _) => Ready(Response("hello")));
            var textResponse = await new SerpApiClient("key", text).SearchHtmlAsync(new() { Query = new() { Engine = "google", Q = "q" } });
            Assert(textResponse.Data == "hello", "native text mode");
            var bytesOp = NativeCatalog.Operations.First(o => o.Mode == "bytes" && o.RequiredQuery.Count == 0);
            using var bytes = Transport((_, _) => Ready(new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent([0, 255, 1]) }));
            var binary = await new NativeClient(bytesOp.Provider, "key", bytes).CallAsync<byte[]>(bytesOp.Name, new() { Body = bytesOp.BodyRequired ? new { } : null, Path = System.Text.RegularExpressions.Regex.Matches(bytesOp.Path, @"\{([^{}]+)\}").ToDictionary(m => m.Groups[1].Value, _ => "fixture") });
            Assert(binary.Data.SequenceEqual(new byte[] { 0, 255, 1 }), "bytes unchanged");
        });
        await Group("incremental SSE UTF8/multiline/CRLF/limits/cancel/disposal", async () =>
        {
            var op = NativeCatalog.Operations.First(o => o.Mode == "sse" && o.BodyRequired && o.RequiredQuery.Count == 0);
            var input = new NativeInput { Body = new { }, Path = System.Text.RegularExpressions.Regex.Matches(op.Path, @"\{([^{}]+)\}").ToDictionary(m => m.Groups[1].Value, _ => "fixture") };
            using (var t = Transport((_, _) => Ready(new HttpResponseMessage(HttpStatusCode.OK) { Content = EventContent(new ChunkStream(Encoding.UTF8.GetBytes("\uFEFF: comment\r\nid: stable\r\nevent: delta\r\nretry: 42\r\ndata: héllo\r\ndata: second\r\n\r\ndata: next\n\ndata: incomplete"), 1)) })))
            { var events = new List<ServerSentEvent>(); await foreach (var e in new NativeClient(op.Provider, "key", t).StreamAsync(op.Name, input)) events.Add(e); Assert(events.Count == 2, "only complete SSE events"); Assert(events[0].Data == "héllo\nsecond" && events[0].Event == "delta" && events[0].Retry == 42 && events[1].Id == "stable", "SSE fields/UTF8/id persistence"); }
            using (var t = Transport((_, _) => Ready(new HttpResponseMessage(HttpStatusCode.OK) { Content = EventContent(new ChunkStream(Encoding.UTF8.GetBytes("data: " + new string('x', 200) + "\n\n"), 1)) }), new() { MaxResponseBytes = 30 }))
                await Error("invalid_response", async () => { await foreach (var _ in new NativeClient(op.Provider, "key", t).StreamAsync(op.Name, input)) { }; });
            using (var t = Transport((_, _) => Ready(new HttpResponseMessage(HttpStatusCode.OK) { Content = EventContent(new HangingStream()) }), new() { Timeout = TimeSpan.FromMilliseconds(30) }))
                await Error("timeout", async () => { await foreach (var _ in new NativeClient(op.Provider, "key", t).StreamAsync(op.Name, input)) { }; });
            using (var t = Transport((_, _) => Ready(new HttpResponseMessage(HttpStatusCode.OK) { Content = EventContent(new HangingStream()) })))
            { using var cts = new CancellationTokenSource(30); await Error("aborted", async () => { await foreach (var _ in new NativeClient(op.Provider, "key", t).StreamAsync(op.Name, input, cts.Token)) { }; }); }
            using (var wrongMime = Transport((_, _) => Ready(Response("data: fixture\n\n"))))
                await Error("invalid_response", async () => { await foreach (var _ in new NativeClient(op.Provider, "key", wrongMime).StreamAsync(op.Name, input)) { }; });
            var stream = new ChunkStream(Encoding.UTF8.GetBytes("data: one\n\ndata: two\n\n"), 1);
            using (var t = Transport((_, _) => Ready(new HttpResponseMessage(HttpStatusCode.OK) { Content = EventContent(stream) })))
            { var sequence = new NativeClient(op.Provider, "key", t).StreamAsync(op.Name, input); await foreach (var _ in sequence) break; Assert(stream.Disposed, "early SSE exit disposes response"); await Error("invalid_request", async () => { await foreach (var _ in sequence) { }; }); }
        });
    }
    static async Task LoopbackTests()
    {
        await Group("actual loopback HTTP/gzip decoded ceiling/redirect isolation", async () =>
        {
            foreach (var mode in new[] { "success", "gzip-limit", "redirect" })
            {
                using var listener = new TcpListener(IPAddress.Loopback, 0);
                listener.Start();
                int port = ((IPEndPoint)listener.LocalEndpoint).Port;
                string? requestText = null;
                var server = Task.Run(async () => { using var socket = await listener.AcceptTcpClientAsync(); await using var stream = socket.GetStream(); var reader = new StreamReader(stream, Encoding.ASCII, false, 1024, true); var headers = new StringBuilder(); while (true) { var line = await reader.ReadLineAsync(); if (line is null || line.Length == 0) break; headers.AppendLine(line); } requestText = headers.ToString(); byte[] body; string extra = ""; int status = 200; if (mode == "gzip-limit") { using var ms = new MemoryStream(); using (var gzip = new GZipStream(ms, CompressionLevel.SmallestSize, true)) gzip.Write(Encoding.UTF8.GetBytes(new string('x', 10000))); body = ms.ToArray(); extra = "Content-Encoding: gzip\r\n"; } else if (mode == "redirect") { status = 307; body = []; extra = "Location: http://127.0.0.1:1/must-not-follow\r\n"; } else body = Encoding.UTF8.GetBytes(Fixture("search-success").GetRawText()); await stream.WriteAsync(Encoding.ASCII.GetBytes($"HTTP/1.1 {status} Fixture\r\nContent-Type: application/json\r\nContent-Length: {body.Length}\r\n{extra}Connection: close\r\n\r\n")); await stream.WriteAsync(body); });
                using var transport = new SearchTransport(new() { MaxResponseBytes = mode == "gzip-limit" ? 1000 : 1024 * 1024 }, new RewriteHandler(port));
                var gateway = new GatewayClient("https://gateway.example/path", transport, _ => ValueTask.FromResult<string?>("top-secret"));
                if (mode == "success")
                    Assert((await gateway.SearchAsync(new("q"))).Provider == "fixture", "loopback HTTP success");
                else
                    await Error(mode == "gzip-limit" ? "invalid_response" : "provider_error", () => gateway.SearchAsync(new("q")));
                await server.WaitAsync(TimeSpan.FromSeconds(3));
                Assert(requestText!.Contains("Authorization: Bearer top-secret", StringComparison.OrdinalIgnoreCase), "explicit app token transported");
                Assert(!requestText.Contains("Cookie:", StringComparison.OrdinalIgnoreCase), "no loopback ambient cookies");
            }
        });
    }
    sealed class Handler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> callback) : HttpMessageHandler { protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => callback(request, cancellationToken); }
    sealed class FixedTime : TimeProvider { public override DateTimeOffset GetUtcNow() => new(2026, 10, 22, 0, 0, 0, TimeSpan.Zero); }
    sealed class HangingStream : Stream
    {
        public override bool CanRead => true; public override bool CanSeek => false; public override bool CanWrite => false; public override long Length => throw new NotSupportedException(); public override long Position { get => 0; set => throw new NotSupportedException(); }
        public override void Flush() { }
        public override int Read(byte[] b, int o, int c) => throw new NotSupportedException(); public override ValueTask<int> ReadAsync(Memory<byte> b, CancellationToken ct = default) => new(new TaskCompletionSource<int>().Task); public override long Seek(long o, SeekOrigin s) => throw new NotSupportedException(); public override void SetLength(long v) => throw new NotSupportedException(); public override void Write(byte[] b, int o, int c) => throw new NotSupportedException();
    }
    sealed class ChunkStream(byte[] bytes, int chunk) : MemoryStream(bytes)
    {
        public bool Disposed { get; private set; }
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) => base.ReadAsync(buffer[..Math.Min(buffer.Length, chunk)], cancellationToken); protected override void Dispose(bool disposing) { Disposed = true; base.Dispose(disposing); }
    }
    sealed class BatchClient : ISearchClient
    {
        int _active; public int Maximum; public async Task<SearchResponse> SearchAsync(SearchRequest request, CancellationToken cancellationToken = default) { int active = Interlocked.Increment(ref _active); Maximum = Math.Max(Maximum, active); try { await Task.Delay(request.Query == "a" ? 30 : 5, cancellationToken); if (request.Query == "bad") throw new SearchException("provider_error"); return new("fixture", [], null, [], []); } finally { Interlocked.Decrement(ref _active); } }
    }
    sealed class RewriteHandler : DelegatingHandler
    {
        readonly int _port; public RewriteHandler(int port) : base(new SocketsHttpHandler { AllowAutoRedirect = false, UseCookies = false, UseProxy = false, Credentials = null, AutomaticDecompression = DecompressionMethods.All }) { _port = port; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) { request.RequestUri = new Uri($"http://127.0.0.1:{_port}{request.RequestUri!.PathAndQuery}"); return base.SendAsync(request, cancellationToken); }
    }
}
