package searchsdk

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func multipartFixture(t *testing.T, field string) ([]byte, string) {
	t.Helper()
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	p, e := w.CreateFormFile(field, "fixture.bin")
	if e != nil {
		t.Fatal(e)
	}
	_, _ = p.Write([]byte{0, 1, 2, 255})
	if w.Close() != nil {
		t.Fatal("multipart")
	}
	return b.Bytes(), w.FormDataContentType()
}
func TestAll493NativeBindingsDispatch(t *testing.T) {
	count := 0
	if len(NativeProviders()) != 13 {
		t.Fatal("provider inventory")
	}
	for _, provider := range NativeProviders() {
		var current Operation
		var calls int
		tr := roundTripFunc(func(r *http.Request) (*http.Response, error) {
			calls++
			if r.Method != current.Method {
				t.Errorf("method %s", r.Method)
			}
			base, _ := url.Parse(current.BaseURL)
			if r.URL.Scheme != "https" || r.URL.Host != base.Host {
				t.Error("fixed origin")
			}
			if r.Header.Get("Cookie") != "" {
				t.Error("ambient cookies")
			}
			public := strings.Contains(current.BaseURL, "logos.context.dev") || strings.Contains(current.BaseURL, "x402.tavily.com")
			if public {
				if r.Header.Get("Authorization") != "" || r.Header.Get("X-Api-Key") != "" {
					t.Error("credential sent to supplemental host")
				}
			} else {
				switch provider {
				case "context", "tavily", "perplexity", "linkup", "firecrawl":
					if r.Header.Get("Authorization") != "Bearer fixture-key" {
						t.Error("bearer auth")
					}
				case "serpapi":
					if current.Name != "locations" && current.Name != "uploadImage" && r.URL.Query().Get("api_key") != "fixture-key" {
						t.Error("query auth")
					}
				case "serper":
					if current.Method == "GET" {
						if r.URL.Query().Get("apiKey") != "fixture-key" || r.Header.Get("X-Api-Key") != "" {
							t.Error("GET auth")
						}
					} else if r.Header.Get("X-Api-Key") != "fixture-key" {
						t.Error("header auth")
					}
				case "brave":
					if r.Header.Get("X-Subscription-Token") != "fixture-key" {
						t.Error("token auth")
					}
				default:
					key := "fixture-key"
					if strings.Contains(current.BaseURL, "admin-api.exa.ai") {
						key = "team-key"
					}
					if r.Header.Get("X-Api-Key") != key {
						t.Error("key auth", provider)
					}
				}
			}
			var b []byte
			switch current.Response {
			case "json":
				b = []byte(`{"unknown":{"preserved":true}}`)
			case "text":
				b = []byte("native text")
			case "bytes":
				b = []byte{0, 255, 1}
			case "raw":
				b = []byte("raw")
			case "sse":
				b = []byte("event: progress\nid: one\ndata: {\"ok\":true}\n\n")
			case "empty":
				b = []byte{}
			}
			resp := wireResponse(200, b)
			if current.Response == "sse" {
				resp.Header.Set("Content-Type", "text/event-stream")
			}
			resp.Header.Set("X-Request-Id", "fixture_1")
			return resp, nil
		})
		c, e := NewNativeClient(provider, NativeOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: tr}, TeamAPIKey: func() string {
			if provider == "exa" {
				return "team-key"
			}
			return ""
		}()})
		if e != nil {
			t.Fatal(e)
		}
		for _, op := range c.Operations() {
			t.Run(provider+"/"+op.Name, func(t *testing.T) {
				count++
				current = op
				in := NativeInput{Path: map[string]any{}, Query: map[string]any{}, Headers: make(http.Header)}
				for _, match := range pathPlaceholder.FindAllStringSubmatch(op.Path, -1) {
					in.Path.(map[string]any)[match[1]] = "id /?#%"
				}
				for _, p := range op.Required {
					switch p.Location {
					case "query":
						in.Query.(map[string]any)[p.Name] = "fixture"
					case "header":
						in.Headers.Set(p.Name, "fixture")
					}
				}
				if op.Name == "logoUrl" || op.Name == "headLogo" {
					in.Query = map[string]any{"publicClientId": "public", "domain": "example.org"}
				}
				if !op.Raw && (op.BodyRequired || op.StreamField) {
					in.Body = map[string]any{}
					if provider == "exa" && op.Name == "searchStream" {
						in.Body.(map[string]any)["outputSchema"] = map[string]any{"type": "object"}
					}
				}
				if op.Raw {
					if strings.HasPrefix(op.RawContentType, "multipart/") {
						field := "file"
						if provider == "serpapi" {
							field = "image"
						}
						b, ct := multipartFixture(t, field)
						in.RawBody = b
						in.Headers.Set("Content-Type", ct)
					} else {
						in.RawBody = []byte{1, 2}
					}
				}
				before := calls
				result, e := c.Call(context.Background(), op.Name, in)
				if e != nil {
					t.Fatal(e)
				}
				if op.Response == "embedding-url" {
					if calls != before || !strings.HasPrefix(result.Text, op.BaseURL) {
						t.Fatal("embedding URL fetched")
					}
					return
				}
				if calls != before+1 {
					t.Fatal("unexpected request count")
				}
				if result.Metadata.RequestID != "fixture_1" || len(result.Metadata.Attempts) != 1 {
					t.Fatal("metadata")
				}
				if op.Response == "sse" {
					ev, e := result.Stream.Next()
					if e != nil || ev.Event != "progress" {
						t.Fatal(ev, e)
					}
					_ = result.Stream.Close()
				}
				if op.Response == "json" && !bytes.Contains(result.Data, []byte("preserved")) {
					t.Fatal("native raw data discarded")
				}
			})
		}
	}
	if count != 493 {
		t.Fatal("operation count", count)
	}
}
func TestTypedNativeRequestsAndResponses(t *testing.T) {
	var calls []*http.Request
	var bodies [][]byte
	tr := roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls = append(calls, r)
		b, _ := io.ReadAll(r.Body)
		bodies = append(bodies, b)
		return wireResponse(200, []byte(`{"requestId":"r1","results":[],"new_field":true}`)), nil
	})
	c, e := NewExaClient(NativeOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: tr}})
	if e != nil {
		t.Fatal(e)
	}
	// Root schemas retain useful fields; extra response fields are retained in Raw.
	body := ExaSearchBody{Query: "search"}
	r, e := c.Search(context.Background(), ExaSearchInput{Body: &body})
	if e != nil {
		t.Fatal(e)
	}
	if !bytes.Contains(r.Raw, []byte("new_field")) {
		t.Fatal("raw response missing")
	}
	var wire map[string]any
	_ = json.Unmarshal(bodies[0], &wire)
	if wire["query"] != "search" {
		t.Fatal("typed request")
	}
	ctxClient, _ := NewContextClient(NativeOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: tr}})
	_, e = ctxClient.Call(context.Background(), "map", NativeInput{Query: map[string]any{"domain": "example.org", "tags": []string{"a", "b"}, "headers": map[string]any{"X-Test": "value"}, "timeoutOpts": map[string]any{"milliseconds": 15000, "behavior": "return-partial"}}})
	if e != nil {
		t.Fatal(e)
	}
	q := calls[1].URL.Query()
	if q.Get("tags") != "a,b" || q.Get("headers[X-Test]") != "value" || q.Get("timeoutOpts[milliseconds]") != "15000" {
		t.Fatal("OpenAPI query encoding", q)
	}
}
func TestNativePathAndHeaderSafety(t *testing.T) {
	var calls atomic.Int32
	c, _ := NewNativeClient("context", NativeOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls.Add(1)
		if strings.Contains(r.URL.EscapedPath(), "/id/") {
			t.Error("unencoded slash")
		}
		return wireResponse(200, []byte(`{}`)), nil
	})}})
	for _, value := range []any{".", "..", "", nil, []string{"x"}, true, mathNaN()} {
		_, e := c.Call(context.Background(), "getLog", NativeInput{Path: map[string]any{"request_id": value}})
		requireCode(t, e, InvalidRequest)
	}
	_, e := c.Call(context.Background(), "getLog", NativeInput{Path: map[string]string{"request_id": "id /?#%"}})
	if e != nil {
		t.Fatal(e)
	}
	if calls.Load() != 1 {
		t.Fatal("path validation dispatched")
	}
	for _, h := range []http.Header{{"Authorization": {"Bearer secret"}}, {"x-api-key": {"secret"}}, {"Cookie": {"secret"}}, {"Host": {"evil"}}, {"X-Test": {"secret\r\ninject"}}, {"bad name": {"value"}}} {
		_, e = c.Call(context.Background(), "listLogs", NativeInput{Headers: h})
		requireCode(t, e, InvalidRequest)
	}
	for _, in := range []NativeInput{{Path: map[string]string{"unexpected": "x"}}, {Query: map[string]any{"x": map[string]any{"nested": []any{"x"}}}}, {Query: map[string]any{"x": []any{map[string]any{}}}}, {Body: map[string]any{}}, {RawBody: []byte{1}}} {
		_, e = c.Call(context.Background(), "listLogs", in)
		requireCode(t, e, InvalidRequest)
	}
	_, e = c.Call(context.Background(), "notAnEndpoint", NativeInput{})
	requireCode(t, e, UnsupportedOption)
	for _, path := range []string{"//evil/x", "/../x", "/%2e%2e/x", "/x?key=secret", "/x#fragment", "/x\\evil", "/{missing}"} {
		_, e := nativeURL(Operation{BaseURL: "https://example.org/base", Path: path}, nil, nil)
		requireCode(t, e, InvalidRequest)
	}
}
func mathNaN() float64 { var z float64; return z / z }
func TestNativeExplicitReplayPolicy(t *testing.T) {
	for _, tc := range []struct {
		provider, name string
		input          NativeInput
		want           int
	}{{"tavily", "getPaymentPricing", NativeInput{}, 2}, {"tavily", "paidSearch", NativeInput{Body: map[string]any{"query": "q"}}, 1}, {"serpapi", "search", NativeInput{Query: map[string]any{"engine": "google", "q": "q"}}, 1}, {"serpapi", "getSearchPixelPositions", NativeInput{Path: map[string]string{"search_id": "id"}}, 1}, {"serpapi", "getSearch", NativeInput{Path: map[string]string{"search_id": "id"}}, 2}} {
		t.Run(tc.name, func(t *testing.T) {
			calls := 0
			c, _ := NewNativeClient(tc.provider, NativeOptions{APIKey: "fixture-key", Retry: RetryPolicy{MaxRetries: 1, BaseDelay: time.Millisecond, MaxDelay: time.Millisecond}, HTTP: HTTPOptions{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
				calls++
				if calls == 1 {
					return wireResponse(503, []byte("secret")), nil
				}
				return wireResponse(200, []byte(`{}`)), nil
			})}})
			_, _ = c.Call(context.Background(), tc.name, tc.input)
			if calls != tc.want {
				t.Fatal("replay policy", calls)
			}
		})
	}
}
func TestNativeSupplementalCredentialsAndMultipart(t *testing.T) {
	var seen []string
	tr := roundTripFunc(func(r *http.Request) (*http.Response, error) {
		seen = append(seen, r.URL.Host)
		if strings.Contains(r.URL.Host, "x402") {
			if r.Header.Get("Authorization") != "" || r.Header.Get("X-Tavily-Access-Mode") != "" {
				t.Error("secret to external paid binding")
			}
			if r.URL.Path == "/search" && r.Header.Get("Payment-Signature") != "externally-authorized" {
				t.Error("external payment authorization lost")
			}
		}
		if r.URL.Host == "api.tavily.com" {
			if r.Header.Get("X-Tavily-Access-Mode") != "keyless" || r.Header.Get("Authorization") != "" {
				t.Error("keyless auth")
			}
		}
		return wireResponse(200, []byte(`{}`)), nil
	})
	c, _ := NewNativeClient("tavily", NativeOptions{AccessMode: "keyless", HTTP: HTTPOptions{Transport: tr}})
	_, e := c.Call(context.Background(), "search", NativeInput{Body: map[string]any{"query": "q"}})
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.Call(context.Background(), "crawl", NativeInput{Body: map[string]any{"url": "https://example.org"}})
	requireCode(t, e, Configuration)
	_, e = c.Call(context.Background(), "paidSearch", NativeInput{Body: map[string]any{"query": "q"}, Headers: http.Header{"Payment-Signature": {"externally-authorized"}}})
	if e != nil {
		t.Fatal(e)
	}
	b, ct := multipartFixture(t, "image")
	s, _ := NewNativeClient("serpapi", NativeOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		reader, e := r.MultipartReader()
		if e != nil {
			t.Fatal(e)
		}
		fields := map[string][]byte{}
		for {
			p, e := reader.NextPart()
			if e == io.EOF {
				break
			}
			if e != nil {
				t.Fatal(e)
			}
			fields[p.FormName()], _ = io.ReadAll(p)
		}
		if string(fields["api_key"]) != "fixture-key" || !reflect.DeepEqual(fields["image"], []byte{0, 1, 2, 255}) {
			t.Error("multipart corrupted")
		}
		return wireResponse(200, []byte(`{"image_id":"fixture"}`)), nil
	})}})
	original := append([]byte{}, b...)
	_, e = s.Call(context.Background(), "uploadImage", NativeInput{RawBody: b, Headers: http.Header{"Content-Type": {ct}}})
	if e != nil {
		t.Fatal(e)
	}
	if !bytes.Equal(b, original) {
		t.Fatal("mutated caller multipart")
	}
}
func TestSSEParsingBoundsAndCleanup(t *testing.T) {
	streamText := "\ufeff: comment\r\nevent: progress\rid: one\rdata: a\rdata: b\rretry: 20\r\rdata: second\n\ndata: incomplete"
	c, _ := NewNativeClient("tavily", NativeOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		r := wireResponse(200, []byte(streamText))
		r.Header.Set("Content-Type", "text/event-stream; charset=utf-8")
		return r, nil
	})}})
	r, e := c.Call(context.Background(), "researchStream", NativeInput{Body: map[string]any{"input": "q"}})
	if e != nil {
		t.Fatal(e)
	}
	ev, e := r.Stream.Next()
	if e != nil || ev.Event != "progress" || ev.Data != "a\nb" || ev.ID == nil || *ev.ID != "one" || ev.Retry == nil || *ev.Retry != 20 {
		t.Fatal(ev, e)
	}
	ev, e = r.Stream.Next()
	if e != nil || ev.Data != "second" || ev.ID == nil || *ev.ID != "one" {
		t.Fatal(ev, e)
	}
	_, e = r.Stream.Next()
	if e != io.EOF {
		t.Fatal("incomplete event must be discarded", e)
	}
	for _, tc := range []struct {
		name        string
		body        []byte
		limit       int64
		contentType string
	}{{"cap", []byte("data: " + strings.Repeat("x", 40) + "\n\n"), 10, "text/event-stream"}, {"encoding", []byte{'d', 'a', 't', 'a', ':', ' ', 255, '\n', '\n'}, 100, "text/event-stream"}, {"mime", []byte(`{}`), 100, "application/json"}} {
		t.Run(tc.name, func(t *testing.T) {
			body := &closeBody{reader: bytes.NewReader(tc.body)}
			cc, _ := NewNativeClient("tavily", NativeOptions{APIKey: "fixture-key", HTTP: HTTPOptions{MaxResponseBytes: tc.limit, Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
				r := wireResponse(200, nil)
				r.Body = body
				r.Header.Set("Content-Type", tc.contentType)
				return r, nil
			})}})
			r, e := cc.Call(context.Background(), "researchStream", NativeInput{Body: map[string]any{"input": "q"}})
			if e == nil {
				_, e = r.Stream.Next()
			}
			requireCode(t, e, InvalidResponse)
			if body.closed.Load() == 0 {
				t.Fatal("stream body leaked")
			}
		})
	}
}
func TestNativeSSELifetimeCancellationAndSlotRelease(t *testing.T) {
	for _, consume := range []bool{false, true} {
		t.Run(fmt.Sprint(consume), func(t *testing.T) {
			body := &blockingBody{done: make(chan struct{})}
			var calls atomic.Int32
			c, _ := NewNativeClient("tavily", NativeOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Timeout: 20 * time.Millisecond, MaxConcurrency: 1, Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
				calls.Add(1)
				r := wireResponse(200, nil)
				r.Body = body
				r.Header.Set("Content-Type", "text/event-stream")
				return r, nil
			})}})
			r, e := c.Call(context.Background(), "researchStream", NativeInput{Body: map[string]any{"input": "q"}})
			if e != nil {
				t.Fatal(e)
			}
			if consume {
				_, e = r.Stream.Next()
				requireCode(t, e, Timeout)
			} else {
				select {
				case <-body.done:
				case <-time.After(time.Second):
					t.Fatal("unconsumed stream deadline leaked")
				}
			}
			_ = r.Stream.Close()
			if len(c.wire.slots) != 0 {
				t.Fatal("slot leaked")
			}
		})
	}
	// Cancel a blocked read over an actual loopback TLS connection.
	started := make(chan struct{})
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(200)
		w.(http.Flusher).Flush()
		close(started)
		<-r.Context().Done()
	}))
	defer server.Close()
	dest, _ := url.Parse(server.URL)
	c, _ := NewNativeClient("tavily", NativeOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		rr := r.Clone(r.Context())
		u := *r.URL
		u.Host = dest.Host
		u.Scheme = dest.Scheme
		rr.URL = &u
		return server.Client().Transport.RoundTrip(rr)
	})}})
	ctx, cancel := context.WithCancel(context.Background())
	r, e := c.Call(ctx, "researchStream", NativeInput{Body: map[string]any{"input": "q"}})
	if e != nil {
		t.Fatal(e)
	}
	<-started
	done := make(chan error, 1)
	go func() { _, e := r.Stream.Next(); done <- e }()
	cancel()
	select {
	case e := <-done:
		requireCode(t, e, Aborted)
	case <-time.After(time.Second):
		t.Fatal("blocked SSE read not canceled")
	}
}
func TestNativeErrorsNeverDiscloseCredentials(t *testing.T) {
	c, _ := NewNativeClient("serpapi", NativeOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) { return nil, errors.New("secret " + r.URL.String()) })}})
	_, e := c.Call(context.Background(), "search", NativeInput{Query: map[string]any{"engine": "google", "q": "secret query"}})
	requireCode(t, e, Network)
	serialized, _ := json.Marshal(e)
	if strings.Contains(string(serialized), "secret") || strings.Contains(string(serialized), "fixture-key") {
		t.Fatal("metadata disclosure")
	}
}

func TestNetHTTPDoesNotSilentlyReplayStaleConnections(t *testing.T) {
	for _, method := range []string{"GET", "POST", "DELETE"} {
		t.Run(method, func(t *testing.T) {
			var calls atomic.Int32
			server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Prime a pooled connection, then close it after receiving the next request
				// without sending response headers. net/http normally replays an idempotent
				// request here, including POSTs carrying Idempotency-Key and GetBody.
				if calls.Add(1) == 1 {
					_, _ = w.Write([]byte(`{}`))
					return
				}
				conn, _, e := w.(http.Hijacker).Hijack()
				if e != nil {
					t.Error(e)
					return
				}
				_ = conn.Close()
			}))
			defer server.Close()
			w, e := newWire(HTTPOptions{Transport: server.Client().Transport})
			if e != nil {
				t.Fatal(e)
			}
			ctx, cancel := context.WithTimeout(context.Background(), time.Second)
			defer cancel()
			response, e := w.send(ctx, "GET", server.URL, nil, nil)
			if e != nil {
				t.Fatal(e)
			}
			if _, e = readCapped(ctx, response, 100); e != nil {
				t.Fatal(e)
			}
			var body []byte
			if method == "POST" {
				body = []byte(`{"query":"q"}`)
			}
			_, e = w.send(ctx, method, server.URL, http.Header{"Idempotency-Key": {"fixture-id"}}, body)
			requireCode(t, e, Network)
			if calls.Load() != 2 {
				t.Fatal("net/http invisibly replayed a request", calls.Load())
			}
		})
	}
}

func TestNativeRejectsMalformedInputEncodingBeforeDispatch(t *testing.T) {
	c, _ := NewNativeClient("context", NativeOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) { t.Fatal("malformed input dispatched"); return nil, nil })}})
	for _, tc := range []struct {
		name  string
		input NativeInput
	}{
		{"getLog", NativeInput{Path: map[string]string{"request_id": string([]byte{255})}}},
		{"listLogs", NativeInput{Query: map[string]any{"search": string([]byte{255})}}},
		{"search", NativeInput{Body: map[string]any{"query": string([]byte{255})}}},
		{"listLogs", NativeInput{Headers: http.Header{"X-Test": {"control\x01"}}}},
	} {
		_, e := c.Call(context.Background(), tc.name, tc.input)
		requireCode(t, e, InvalidRequest)
	}
	cycle := map[string]any{}
	cycle["self"] = cycle
	_, e := c.Call(context.Background(), "search", NativeInput{Body: cycle})
	requireCode(t, e, InvalidRequest)
}
