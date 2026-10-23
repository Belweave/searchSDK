using System.Text;
using System.Text.Json;

namespace SearchSdk;

/// <summary>Application gateway protocol v1. No retries; application token lookup counts toward the deadline.</summary>
public sealed class GatewayClient : ISearchClient
{
    private readonly Uri _endpoint;
    private readonly SearchTransport _transport;
    private readonly Func<CancellationToken, ValueTask<string?>>? _token;
    public GatewayClient(string endpoint, SearchTransport transport, Func<CancellationToken, ValueTask<string?>>? accessToken = null)
    {
        _endpoint = SearchTransport.Endpoint(endpoint);
        _transport = transport ?? throw new SearchException("configuration");
        _token = accessToken;
    }
    public Task<SearchResponse> SearchAsync(SearchRequest request, CancellationToken cancellationToken = default)
    {
        request = (request ?? throw new SearchException("invalid_request")).Validate();
        return _transport.RunAsync(async ct =>
        {
            var token = _token is null ? null : await _token(ct).AsTask().WaitAsync(ct).ConfigureAwait(false);
            if (token is not null)
                SearchTransport.Credential(token);
            var message = new HttpRequestMessage(HttpMethod.Post, _endpoint) { Content = new StringContent(JsonSerializer.Serialize(request, Wire.Json), Encoding.UTF8, "application/json") };
            if (token is not null)
                SearchTransport.Header(message, "Authorization", "Bearer " + token);
            return message;
        }, raw =>
        {
            if (raw.Headers.TryGetValue("X-SearchSDK-Protocol", out var versions) && (versions.Length != 1 || versions[0] != "1"))
                throw new SearchException("invalid_response");
            if (raw.Status != 200)
            {
                string code = SearchException.StatusCode(raw.Status);
                IReadOnlyList<SearchAttempt> attempts = [];
                int? status = raw.Status;
                double? retry = null;
                try
                {
                    var error = Wire.Get(raw.Json, "error");
                    Wire.Object(error);
                    var candidate = Wire.String(Wire.Get(error, "code"));
                    if (candidate is null || !SearchException.Codes.Contains(candidate))
                        throw new SearchException("invalid_response");
                    var parsed = Wire.Attempts(Wire.Get(error, "attempts"));
                    var s = Wire.Number(Wire.Get(error, "status"));
                    var r = Wire.Number(Wire.Get(error, "retryAfterMs"));
                    if (s is not null && (s < 100 || s > 599 || s != Math.Truncate(s.Value)) || r < 0)
                        throw new SearchException("invalid_response");
                    code = candidate;
                    attempts = parsed;
                    status = (int?)s ?? raw.Status;
                    retry = r;
                }
                catch {/* malformed envelopes use sanitized status mapping */}
                throw new SearchException(code, status, retry, attempts);
            }
            try
            {
                var result = Wire.Response(raw.Json);
                return result with
                {
                    Results = result.Results.Take(request.Limit).ToArray()
                };
            }
            catch { throw new SearchException("invalid_response"); }
        }, cancellationToken, allowError: true);
    }
}
