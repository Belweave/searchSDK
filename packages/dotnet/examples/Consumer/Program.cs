using SearchSdk;
using System.Net;
using System.Text;
using System.Text.Json;

// This executable is deliberately deterministic. Supply server-held credentials and use
// the default isolated SearchTransport in a real application; never ship provider keys to apps.
using var transport = new SearchTransport(handler: new FixtureHandler());
var provider = new NormalizedProvider("exa", "synthetic-key", transport);
var search = new SearchClient(provider);
var result = await search.SearchAsync(new("SDK consumer", Limit: 3));
if (result.Provider != "exa" || result.Results.Count != 1 || result.Attempts.Count != 1)
    throw new Exception("Installed package normalized search failed.");

var native = new TavilyClient("synthetic-key", transport);
var wire = await native.SearchAsync(new() { Body = new() { Query = "SDK consumer", MaxResults = 3 } });
if (wire.Data.Query != "SDK consumer" || wire.Data.AdditionalProperties!["future_field"].GetBoolean() != true)
    throw new Exception("Installed package typed native response failed.");

var gateway = new GatewayClient("https://application.example/search", transport,
    _ => ValueTask.FromResult<string?>("synthetic-app-token"));
var appResult = await gateway.SearchAsync(new("SDK consumer"));
if (appResult.Results.Count != 0 || NativeCatalog.Operations.Count != 493)
    throw new Exception("Installed package gateway/catalog failed.");
if (typeof(SearchClient).Assembly.Location.Contains("/src/", StringComparison.Ordinal))
    throw new Exception("Consumer must resolve the packed assembly, not a project reference.");
Console.WriteLine("Installed NuGet consumer: normalized, typed native, gateway, and 493-operation catalog passed.");

sealed class FixtureHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        string json = request.RequestUri!.Host switch {
            "api.exa.ai" => """{"results":[{"url":"https://example.org/reference","title":"Synthetic"}]}""",
            "api.tavily.com" => """{"query":"SDK consumer","answer":null,"images":[],"results":[],"response_time":0.01,"future_field":true}""",
            _ => """{"provider":"fixture","results":[],"usage":null,"warnings":[],"attempts":[]}"""
        };
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") });
    }
}
