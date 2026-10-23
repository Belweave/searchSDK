using System.Net;
using System.Text;
using System.Text.Json;
using System.Runtime.CompilerServices;

namespace SearchSdk;

public sealed record TransportOptions
{
    public TimeSpan Timeout { get; init; } = TimeSpan.FromSeconds(10);
    public int MaxResponseBytes { get; init; } = 10 * 1024 * 1024;
    public int MaxRequestBytes { get; init; } = 10 * 1024 * 1024;
    public int MaxConcurrency { get; init; } = 4;
}
/// <summary>Bounded raw response. Headers are intentionally available only on successful native calls.</summary>
public sealed record RawResponse(int Status, IReadOnlyDictionary<string, string[]> Headers, byte[] Body)
{
    public string Text => new UTF8Encoding(false, true).GetString(Body);
    public JsonElement Json
    {
        get
        {
            try
            {
                using var d = JsonDocument.Parse(Body);
                return d.RootElement.Clone();
            }
            catch { throw new SearchException("invalid_response"); }
        }
    }
}
public sealed record ServerSentEvent(string Data, string? Event = null, string? Id = null, int? Retry = null);

internal sealed class CallScope : IDisposable
{
    private readonly CancellationToken _caller;
    private readonly long _started = System.Diagnostics.Stopwatch.GetTimestamp();
    private readonly TimeSpan _timeout;
    private readonly CancellationTokenSource _deadline;
    private readonly CancellationTokenSource _linked;
    public CancellationToken Token => _linked.Token;
    public CallScope(TimeSpan timeout, CancellationToken caller)
    {
        if (timeout <= TimeSpan.Zero || timeout > TimeSpan.FromDays(1))
            throw new SearchException("configuration");
        _caller = caller;
        _timeout = timeout;
        _deadline = new(timeout);
        _linked = CancellationTokenSource.CreateLinkedTokenSource(caller, _deadline.Token);
    }
    public void Check()
    {
        if (_caller.IsCancellationRequested)
            throw new SearchException("aborted");
        if (_deadline.IsCancellationRequested || System.Diagnostics.Stopwatch.GetElapsedTime(_started) >= _timeout)
            throw new SearchException("timeout");
    }
    public SearchException Error()
    {
        Check();
        return new SearchException("network");
    }
    public void Dispose()
    {
        _linked.Dispose();
        _deadline.Dispose();
    }
}

/// <summary>Owns an isolated HttpClient. Default handlers disable proxies, cookies, redirects, and ambient credentials.
/// An injected handler is a trusted application transport and must enforce the same boundary.</summary>
public sealed class SearchTransport : IDisposable
{
    private readonly HttpClient _http;
    private readonly SemaphoreSlim _gate;
    public TransportOptions Options
    { get; }
    public SearchTransport(TransportOptions? options = null, HttpMessageHandler? handler = null)
    {
        Options = options ?? new();
        if (Options.Timeout <= TimeSpan.Zero || Options.Timeout > TimeSpan.FromDays(1) || Options.MaxConcurrency is < 1 or > 64 || Options.MaxResponseBytes < 1 || Options.MaxRequestBytes < 1)
            throw new SearchException("configuration");
        _gate = new(Options.MaxConcurrency);
        _http = new HttpClient(handler ?? new SocketsHttpHandler { AllowAutoRedirect = false, UseCookies = false, UseProxy = false, Credentials = null, PreAuthenticate = false, AutomaticDecompression = DecompressionMethods.All }, true) { Timeout = System.Threading.Timeout.InfiniteTimeSpan };
    }
    internal static Uri Endpoint(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Any(c => char.IsWhiteSpace(c) || char.IsControl(c) || c == '\\') || value.Contains('?') || value.Contains('#') || !Uri.TryCreate(value, UriKind.Absolute, out var u) || u.Scheme != "https" || u.UserInfo.Length != 0)
            throw new SearchException("configuration");
        return u;
    }
    internal static void Credential(string? value, string code = "configuration")
    {
        if (string.IsNullOrEmpty(value) || value.Any(c => c < 33 || c > 126))
            throw new SearchException(code);
    }
    internal static void Header(HttpRequestMessage request, string name, string value)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(name, "^[!#$%&'*+.^_`|~0-9A-Za-z-]+\\z", System.Text.RegularExpressions.RegexOptions.CultureInvariant) || value.Any(c => c < 32 || c == 127) || new[] { "host", "cookie", "cookie2", "proxy-authorization", "connection", "content-length", "transfer-encoding" }.Contains(name.ToLowerInvariant()))
            throw new SearchException("invalid_request");
        if (name.Equals("Content-Type", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Content is null || !System.Net.Http.Headers.MediaTypeHeaderValue.TryParse(value, out var type))
                throw new SearchException("invalid_request");
            request.Content.Headers.ContentType = type;
        }
        else if (!request.Headers.TryAddWithoutValidation(name, value))
            throw new SearchException("invalid_request");
    }
    private async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        if (request.Content is not null)
        {
            var body = await request.Content.ReadAsByteArrayAsync(ct).WaitAsync(ct).ConfigureAwait(false);
            if (body.Length > Options.MaxRequestBytes)
                throw new SearchException("invalid_request");
        }
        var pending = _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        try
        {
            return await pending.WaitAsync(ct).ConfigureAwait(false);
        }
        catch { _ = pending.ContinueWith(t => { if (t.IsCompletedSuccessfully) t.Result.Dispose(); else _ = t.Exception; }, CancellationToken.None, TaskContinuationOptions.ExecuteSynchronously, TaskScheduler.Default); throw; }
    }
    private async Task<byte[]> ReadAsync(HttpResponseMessage response, CancellationToken ct)
    {
        if (response.Content.Headers.ContentLength > Options.MaxResponseBytes && !response.Content.Headers.ContentEncoding.Any())
            throw new SearchException("invalid_response");
        await using var stream = await response.Content.ReadAsStreamAsync(ct).WaitAsync(ct).ConfigureAwait(false);
        using var output = new MemoryStream();
        var buffer = new byte[Math.Min(16384, Options.MaxResponseBytes + (Options.MaxResponseBytes == int.MaxValue ? 0 : 1))];
        while (true)
        {
            var count = await stream.ReadAsync(buffer, ct).AsTask().WaitAsync(ct).ConfigureAwait(false);
            if (count == 0)
                break;
            if (output.Length + count > Options.MaxResponseBytes)
                throw new SearchException("invalid_response");
            output.Write(buffer, 0, count);
        }
        return output.ToArray();
    }
    internal static double? RetryAfter(HttpResponseMessage r)
    {
        if (!r.Headers.TryGetValues("Retry-After", out var values))
            return null;
        var value = values.FirstOrDefault()?.Trim();
        if (string.IsNullOrEmpty(value))
            return null;
        if (System.Text.RegularExpressions.Regex.IsMatch(value, @"\A[0-9]+(?:\.[0-9]+)?\z", System.Text.RegularExpressions.RegexOptions.CultureInvariant) && double.TryParse(value, System.Globalization.NumberStyles.AllowDecimalPoint, System.Globalization.CultureInfo.InvariantCulture, out var seconds))
        {
            var milliseconds = seconds * 1000;
            return double.IsFinite(milliseconds) ? milliseconds : null;
        }
        return DateTimeOffset.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var date) ? Math.Max(0, (date - DateTimeOffset.UtcNow).TotalMilliseconds) : null;
    }
    internal async Task<T> RunAsync<T>(Func<CancellationToken, Task<HttpRequestMessage>> create, Func<RawResponse, T> parse, CancellationToken cancellationToken, TimeSpan? timeout = null, bool allowError = false)
    {
        using var scope = new CallScope(timeout ?? Options.Timeout, cancellationToken);
        bool entered = false;
        try
        {
            scope.Check();
            await _gate.WaitAsync(scope.Token).ConfigureAwait(false);
            entered = true;
            using var request = await create(scope.Token).WaitAsync(scope.Token).ConfigureAwait(false);
            scope.Check();
            using var response = await SendAsync(request, scope.Token).ConfigureAwait(false);
            scope.Check();
            var status = (int)response.StatusCode;
            if (status is >= 300 and <= 399)
                throw new SearchException("provider_error", status);
            if (!response.IsSuccessStatusCode && !allowError)
                throw new SearchException(SearchException.StatusCode(status), status, RetryAfter(response));
            var bytes = await ReadAsync(response, scope.Token).ConfigureAwait(false);
            scope.Check();
            var headers = response.Headers.Concat(response.Content.Headers).ToDictionary(h => h.Key, h => h.Value.ToArray(), StringComparer.OrdinalIgnoreCase);
            var result = parse(new(status, headers, bytes));
            scope.Check();
            return result;
        }
        catch (SearchException) { scope.Check(); throw; }
        catch { throw scope.Error(); }
        finally { if (entered) _gate.Release(); }
    }
    internal async IAsyncEnumerable<ServerSentEvent> StreamAsync(Func<CancellationToken, Task<HttpRequestMessage>> create, TimeSpan? timeout = null, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        using var scope = new CallScope(timeout ?? Options.Timeout, cancellationToken);
        bool entered = false;
        HttpResponseMessage? response = null;
        HttpRequestMessage? request = null;
        try
        {
            try
            {
                scope.Check();
                await _gate.WaitAsync(scope.Token).ConfigureAwait(false);
                entered = true;
                request = await create(scope.Token).WaitAsync(scope.Token).ConfigureAwait(false);
                response = await SendAsync(request, scope.Token).ConfigureAwait(false);
                if (!response.IsSuccessStatusCode)
                    throw new SearchException(SearchException.StatusCode((int)response.StatusCode), (int)response.StatusCode, RetryAfter(response));
                if (!string.Equals(response.Content.Headers.ContentType?.MediaType, "text/event-stream", StringComparison.OrdinalIgnoreCase))
                    throw new SearchException("invalid_response");
            }
            catch (SearchException) { scope.Check(); throw; }
            catch { throw scope.Error(); }
            Stream stream;
            try
            {
                stream = await response.Content.ReadAsStreamAsync(scope.Token).WaitAsync(scope.Token).ConfigureAwait(false);
            }
            catch { throw scope.Error(); }
            await using (stream.ConfigureAwait(false))
            {
                // Decode one bounded UTF-8 line at a time. Counts every decoded transport byte, including comments.
                var line = new List<byte>();
                var data = new List<string>();
                string? eventName = null, id = null;
                int? retry = null;
                int total = 0;
                bool afterCr = false;
                bool first = true;
                var buffer = new byte[4096];
                while (true)
                {
                    int n;
                    try
                    {
                        n = await stream.ReadAsync(buffer, scope.Token).AsTask().WaitAsync(scope.Token).ConfigureAwait(false);
                        scope.Check();
                    }
                    catch (SearchException) { throw; }
                    catch { throw scope.Error(); }
                    if (n == 0)
                        break;
                    if ((long)total + n > Options.MaxResponseBytes)
                        throw new SearchException("invalid_response");
                    total += n;
                    for (int i = 0; i < n; i++)
                    {
                        var b = buffer[i];
                        if (afterCr && b == 10)
                        {
                            afterCr = false;
                            continue;
                        }
                        afterCr = b == 13;
                        if (b is not (10 or 13))
                        {
                            line.Add(b);
                            continue;
                        }
                        string s;
                        try
                        {
                            s = new UTF8Encoding(false, true).GetString(line.ToArray());
                        }
                        catch { throw new SearchException("invalid_response"); }
                        line.Clear();
                        if (first)
                        {
                            s = s.TrimStart('\uFEFF');
                            first = false;
                        }
                        if (s.Length == 0)
                        {
                            if (data.Count > 0)
                                yield return new(string.Join("\n", data), eventName, id, retry);
                            data.Clear();
                            eventName = null;
                            retry = null;
                            continue;
                        }
                        if (s[0] == ':')
                            continue;
                        var colon = s.IndexOf(':');
                        var field = colon < 0 ? s : s[..colon];
                        var value = colon < 0 ? "" : s[(colon + 1)..];
                        if (value.StartsWith(' '))
                            value = value[1..];
                        switch (field)
                        {
                            case "data":
                                data.Add(value);
                                break;
                            case "event":
                                eventName = value;
                                break;
                            case "id":
                                if (!value.Contains('\0'))
                                    id = value;
                                break;
                            case "retry":
                                if (value.All(char.IsAsciiDigit) && int.TryParse(value, out var v))
                                    retry = v;
                                break;
                        }
                    }
                }
                // SSE dispatches only complete blank-line-terminated events, per the event stream format.
            }
        }
        finally { response?.Dispose(); request?.Dispose(); if (entered) _gate.Release(); }
    }
    public void Dispose()
    {
        _http.Dispose(); /* gates may still have canceled waiters; do not dispose them mid-call */
    }
}
