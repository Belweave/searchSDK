// Generated; see generate.py and SOURCES.md.
#nullable enable
namespace SearchSdk;
internal static class ContextLogo
{
    internal static string Url(ContextLogoUrlQuery? query)
    {
        if(query is null || string.IsNullOrWhiteSpace(query.PublicClientId) || string.IsNullOrWhiteSpace(query.Domain) || query.Theme is not null and not ("light" or "dark") || query.Type is not null and not ("icon" or "wordmark") || query.AdditionalProperties?.Count > 0) throw new SearchException("invalid_request");
        return "https://logos.context.dev/?" + NativeClient.QueryString(System.Text.Json.JsonSerializer.SerializeToNode(query,Wire.Json)!.AsObject(),[]);
    }
}
public static partial class NativeCatalog
{
    private static readonly Lazy<IReadOnlyList<NativeOperation>> All = new(() => System.Array.AsReadOnly(new NativeOperation[][] { BraveOperations!, ContextOperations!, ExaOperations!, FirecrawlOperations!, LinkupOperations!, ParallelOperations!, PerplexityOperations!, SerpApiOperations!, SerperOperations!, TavilyOperations!, TinyfishOperations!, WondersearchOperations!, YouOperations! }.SelectMany(x=>x).ToArray()));
    public static IReadOnlyList<NativeOperation> Operations => All.Value;
}
