package searchsdk

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type testProvider struct {
	id   string
	caps Capabilities
	run  func(context.Context, Request) (ProviderResponse, error)
}

func (p testProvider) ID() string                 { return p.id }
func (p testProvider) Capabilities() Capabilities { return p.caps }
func (p testProvider) Search(c context.Context, r Request) (ProviderResponse, error) {
	return p.run(c, r)
}
func emptyResponse() ProviderResponse {
	return ProviderResponse{Results: []Result{}, Warnings: []Warning{}}
}
func mustClient(t *testing.T, c Config) *Client {
	t.Helper()
	s, e := New(c)
	if e != nil {
		t.Fatal(e)
	}
	return s
}
func TestExplicitRetryFallbackAndPreflight(t *testing.T) {
	var calls atomic.Int32
	first := testProvider{id: "first", run: func(context.Context, Request) (ProviderResponse, error) {
		calls.Add(1)
		return ProviderResponse{}, fail(Unavailable)
	}}
	second := testProvider{id: "second", run: func(context.Context, Request) (ProviderResponse, error) { calls.Add(1); return emptyResponse(), nil }}
	c := mustClient(t, Config{Provider: first})
	_, e := c.Search(context.Background(), Request{Query: "secret query"})
	requireCode(t, e, Unavailable)
	if calls.Load() != 1 {
		t.Fatal("implicit retry")
	}
	calls.Store(0)
	c = mustClient(t, Config{Provider: first, Fallback: []Provider{second}, Retry: RetryPolicy{MaxRetries: 1, BaseDelay: time.Millisecond, MaxDelay: time.Millisecond}})
	v, e := c.Search(context.Background(), Request{Query: "x"})
	if e != nil {
		t.Fatal(e)
	}
	if calls.Load() != 3 || len(v.Attempts) != 3 || v.Provider != "second" || v.Warnings[0].Code != "fallback_used" {
		t.Fatal("retry/fallback metadata", v)
	}
	calls.Store(0)
	_, e = c.Search(context.Background(), Request{Query: "x", IncludeDomains: []string{"example.com"}})
	requireCode(t, e, UnsupportedOption)
	if calls.Load() != 0 {
		t.Fatal("dispatched unsupported option")
	}
	terminal := []Code{Auth, InvalidResponse, InvalidRequest, UnsupportedOption, Configuration, ProviderError, Aborted, Timeout}
	for _, code := range terminal {
		calls.Store(0)
		p := first
		p.run = func(context.Context, Request) (ProviderResponse, error) {
			calls.Add(1)
			return ProviderResponse{}, fail(code)
		}
		cc := mustClient(t, Config{Provider: p, Fallback: []Provider{second}, Retry: RetryPolicy{MaxRetries: 2}})
		_, e = cc.Search(context.Background(), Request{Query: "x"})
		requireCode(t, e, code)
		if calls.Load() != 1 {
			t.Fatal("retried terminal error", code)
		}
	}
}
func TestCancellationDeadlinesQueueAndRetryAfter(t *testing.T) {
	p := testProvider{id: "slow", run: func(ctx context.Context, _ Request) (ProviderResponse, error) {
		<-ctx.Done()
		return ProviderResponse{}, ctx.Err()
	}}
	c := mustClient(t, Config{Provider: p, Timeout: time.Second, AttemptTimeout: 10 * time.Millisecond})
	_, e := c.Search(context.Background(), Request{Query: "x"})
	requireCode(t, e, AttemptTimeout)
	c = mustClient(t, Config{Provider: p, Timeout: 10 * time.Millisecond})
	_, e = c.Search(context.Background(), Request{Query: "x"})
	requireCode(t, e, Timeout)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, e = c.Search(ctx, Request{Query: "x"})
	requireCode(t, e, Aborted)
	ctx, cancel = context.WithTimeout(context.Background(), time.Millisecond)
	defer cancel()
	_, e = c.Search(ctx, Request{Query: "x"})
	requireCode(t, e, Timeout)
	started := make(chan struct{})
	p.run = func(ctx context.Context, _ Request) (ProviderResponse, error) {
		select {
		case started <- struct{}{}:
		default:
		}
		<-ctx.Done()
		return ProviderResponse{}, ctx.Err()
	}
	c = mustClient(t, Config{Provider: p, Timeout: time.Second, MaxConcurrency: 1})
	outer, stop := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { _, e := c.Search(outer, Request{Query: "first"}); done <- e }()
	<-started
	queued, qcancel := context.WithTimeout(context.Background(), 5*time.Millisecond)
	defer qcancel()
	_, e = c.Search(queued, Request{Query: "second"})
	requireCode(t, e, Timeout)
	stop()
	requireCode(t, <-done, Aborted)
	var calls atomic.Int32
	p.run = func(context.Context, Request) (ProviderResponse, error) {
		calls.Add(1)
		e := fail(RateLimit)
		e.RetryAfterMS = Ptr(10000.0)
		return ProviderResponse{}, e
	}
	c = mustClient(t, Config{Provider: p, Timeout: 10 * time.Millisecond, Retry: RetryPolicy{MaxRetries: 2, BaseDelay: time.Millisecond, MaxDelay: time.Millisecond}})
	_, e = c.Search(context.Background(), Request{Query: "x"})
	requireCode(t, e, Timeout)
	if calls.Load() != 1 {
		t.Fatal("shortened retry-after")
	}
}
func TestBatchBoundedOrderedIndependent(t *testing.T) {
	var active, maxActive atomic.Int32
	p := testProvider{id: "fixture", run: func(ctx context.Context, r Request) (ProviderResponse, error) {
		n := active.Add(1)
		defer active.Add(-1)
		for {
			m := maxActive.Load()
			if n <= m || maxActive.CompareAndSwap(m, n) {
				break
			}
		}
		select {
		case <-time.After(time.Millisecond):
		case <-ctx.Done():
			return ProviderResponse{}, ctx.Err()
		}
		if r.Query == "bad" {
			return ProviderResponse{}, fail(Auth)
		}
		return emptyResponse(), nil
	}}
	c := mustClient(t, Config{Provider: p, MaxConcurrency: 2})
	inputs := []Request{{Query: "one"}, {Query: "bad"}, {Query: "three"}, {Query: "four"}}
	out, e := SearchBatch(context.Background(), c, inputs, BatchOptions{Concurrency: 4})
	if e != nil {
		t.Fatal(e)
	}
	for i, v := range out {
		if i != v.Index || i == 1 && v.Error == nil || i != 1 && v.Value == nil {
			t.Fatal("lost item", i, v)
		}
	}
	if maxActive.Load() > 2 {
		t.Fatal("unbounded concurrency")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	out, e = SearchBatch(ctx, c, inputs, BatchOptions{Concurrency: 2})
	if e != nil {
		t.Fatal(e)
	}
	for _, o := range out {
		requireCode(t, o.Error, Aborted)
	}
}
func TestCustomProviderValidationAndSanitization(t *testing.T) {
	p := testProvider{id: "custom", run: func(context.Context, Request) (ProviderResponse, error) {
		return ProviderResponse{}, errors.New("secret https://upstream/?key=fixture-key query")
	}}
	c := mustClient(t, Config{Provider: p})
	_, e := c.Search(context.Background(), Request{Query: "secret"})
	requireCode(t, e, ProviderError)
	bad := emptyResponse()
	bad.Results = []Result{{URL: "https://example.org", Score: Ptr(math.NaN()), Provenance: Provenance{Provider: "custom", SourceURL: "https://example.org", RetrievedAt: time.Now().Format(time.RFC3339)}}}
	p.run = func(context.Context, Request) (ProviderResponse, error) { return bad, nil }
	c = mustClient(t, Config{Provider: p})
	_, e = c.Search(context.Background(), Request{Query: "x"})
	requireCode(t, e, InvalidResponse)
}

type closeBody struct {
	reader io.Reader
	closed atomic.Int32
}

func (b *closeBody) Read(p []byte) (int, error) { return b.reader.Read(p) }
func (b *closeBody) Close() error               { b.closed.Add(1); return nil }

type blockingBody struct {
	once sync.Once
	done chan struct{}
}

func (b *blockingBody) Read([]byte) (int, error) { <-b.done; return 0, io.ErrClosedPipe }
func (b *blockingBody) Close() error             { b.once.Do(func() { close(b.done) }); return nil }
func TestHTTPBoundsEncodingAndCleanup(t *testing.T) {
	for _, tc := range []struct {
		name     string
		body     []byte
		encoding string
		limit    int64
		want     Code
	}{{"overflow", []byte(`{"results":[]}`), "", 5, InvalidResponse}, {"invalid-utf8", []byte{'{', '"', 'x', '"', ':', '"', 255, '"', '}'}, "", 100, InvalidResponse}, {"invalid-json", []byte(`{"secret":`), "", 100, InvalidResponse}, {"trailing-json", []byte(`{} {}`), "", 100, InvalidResponse}, {"array", []byte(`[]`), "", 100, InvalidResponse}, {"gzip-overflow", gzipBytes(t, []byte(strings.Repeat(" ", 5000)+`{}`)), "gzip", 30, InvalidResponse}, {"encoding", []byte(`{}`), "br", 100, InvalidResponse}} {
		t.Run(tc.name, func(t *testing.T) {
			body := &closeBody{reader: bytes.NewReader(tc.body)}
			a, e := NewAdapter("exa", AdapterOptions{APIKey: "fixture-key", HTTP: HTTPOptions{MaxResponseBytes: tc.limit, Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
				r := wireResponse(200, nil)
				r.Body = body
				r.Header.Set("Content-Encoding", tc.encoding)
				return r, nil
			})}})
			if e != nil {
				t.Fatal(e)
			}
			_, e = a.Search(context.Background(), Request{Query: "secret"})
			requireCode(t, e, tc.want)
			if body.closed.Load() == 0 {
				t.Fatal("body leaked")
			}
		})
	}
	b := &blockingBody{done: make(chan struct{})}
	a, _ := NewAdapter("exa", AdapterOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Timeout: 10 * time.Millisecond, Transport: roundTripFunc(func(*http.Request) (*http.Response, error) { r := wireResponse(200, nil); r.Body = b; return r, nil })}})
	_, e := a.Search(context.Background(), Request{Query: "x"})
	requireCode(t, e, Timeout)
	select {
	case <-b.done:
	default:
		t.Fatal("deadline did not close reader")
	}
	for _, status := range []int{401, 402, 403, 432, 433, 429, 408, 500, 503, 400, 302} {
		body := &closeBody{reader: strings.NewReader("secret fixture-key")}
		a, _ := NewAdapter("exa", AdapterOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			r := wireResponse(status, nil)
			r.Body = body
			r.Header.Set("Retry-After", "1.5")
			return r, nil
		})}})
		_, e = a.Search(context.Background(), Request{Query: "secret"})
		requireCode(t, e, statusError(status).Code)
		if body.closed.Load() == 0 {
			t.Fatal("error body leaked")
		}
		se := e.(*Error)
		if se.RetryAfterMS == nil || *se.RetryAfterMS != 1500 {
			t.Fatal("retry-after")
		}
	}
	a, _ = NewAdapter("serpapi", AdapterOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) { return nil, fmt.Errorf("secret %s %v", r.URL, r.Header) })}})
	_, e = a.Search(context.Background(), Request{Query: "secret"})
	requireCode(t, e, Network)
}
func gzipBytes(t *testing.T, b []byte) []byte {
	t.Helper()
	var out bytes.Buffer
	g := gzip.NewWriter(&out)
	_, _ = g.Write(b)
	if g.Close() != nil {
		t.Fatal("gzip")
	}
	return out.Bytes()
}
func TestRealTLSTransportNoRedirectForwarding(t *testing.T) {
	var landed atomic.Int32
	sink := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		landed.Add(1)
		t.Error("credentials forwarded across redirect")
	}))
	defer sink.Close()
	first := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/exact" || r.Header.Get("Authorization") != "Bearer app-token" {
			t.Error("wrong endpoint/token")
		}
		http.Redirect(w, r, sink.URL+"/sink", 307)
	}))
	defer first.Close()
	g, e := NewGateway(first.URL+"/exact", HTTPOptions{Transport: first.Client().Transport})
	if e != nil {
		t.Fatal(e)
	}
	_, e = g.SearchWithToken(context.Background(), Request{Query: "x"}, "app-token")
	requireCode(t, e, ProviderError)
	if landed.Load() != 0 {
		t.Fatal("redirect followed")
	}
	for _, u := range []string{"http://localhost", "https://user:secret@example.org", "https://example.org?x=1", "https://example.org?", "https://example.org#", "https://example.org/#x", "https://example.org\\evil"} {
		if _, e := NewGateway(u, HTTPOptions{}); e == nil {
			t.Fatal("accepted endpoint", u)
		}
	}
	// Exercise a normalized adapter over an actual loopback TLS socket while its
	// public endpoint remains fixed. No external request leaves this test.
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/search" || r.Header.Get("X-Api-Key") != "fixture-key" {
			t.Error("adapter wire")
		}
		w.Header().Set("Content-Encoding", "gzip")
		_, _ = w.Write(gzipBytes(t, []byte(`{"results":[]}`)))
	}))
	defer server.Close()
	dest, _ := url.Parse(server.URL)
	a, _ := NewAdapter("exa", AdapterOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		rr := r.Clone(r.Context())
		u := *r.URL
		u.Scheme = dest.Scheme
		u.Host = dest.Host
		rr.URL = &u
		return server.Client().Transport.RoundTrip(rr)
	})}})
	v, e := a.Search(context.Background(), Request{Query: "x"})
	if e != nil || len(v.Results) != 0 {
		t.Fatal(v, e)
	}
}
func TestGatewayConsumedFieldValidation(t *testing.T) {
	var baseline map[string]any
	_ = json.Unmarshal(fixture(t, "search-success.json"), &baseline)
	mutations := []func(map[string]any){func(m map[string]any) { delete(m, "usage") }, func(m map[string]any) { m["provider"] = nil }, func(m map[string]any) { m["results"] = nil }, func(m map[string]any) { m["warnings"] = nil }, func(m map[string]any) { m["reuse"] = "invalid" }, func(m map[string]any) { m["attempts"].([]any)[0].(map[string]any)["durationMs"] = nil }, func(m map[string]any) {
		m["results"].([]any)[0].(map[string]any)["url"] = "https://user:secret@example.org"
	}, func(m map[string]any) { m["results"].([]any)[0].(map[string]any)["provenance"] = map[string]any{} }, func(m map[string]any) { m["usage"] = map[string]any{"unit": "usd"} }, func(m map[string]any) { m["warnings"] = []any{map[string]any{"code": "unsafe", "provider": "fixture"}} }}
	for i, mut := range mutations {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			b, _ := json.Marshal(baseline)
			var m map[string]any
			_ = json.Unmarshal(b, &m)
			mut(m)
			b, _ = json.Marshal(m)
			g, _ := NewGateway("https://app.example/exact", HTTPOptions{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) { return wireResponse(200, b), nil })})
			_, e := g.Search(context.Background(), Request{Query: "x"})
			requireCode(t, e, InvalidResponse)
		})
	}
	for _, status := range []int{401, 429, 503, 400} {
		g, _ := NewGateway("https://app.example", HTTPOptions{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			return wireResponse(status, []byte(`{"error":{"code":"secret","attempts":[]}}`)), nil
		})})
		_, e := g.Search(context.Background(), Request{Query: "x"})
		requireCode(t, e, statusError(status).Code)
	}
	g, _ := NewGateway("https://app.example", HTTPOptions{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		r := wireResponse(200, fixture(t, "search-success.json"))
		r.Header.Set("X-SearchSDK-Protocol", "2")
		return r, nil
	})})
	_, e := g.Search(context.Background(), Request{Query: "x"})
	requireCode(t, e, InvalidResponse)
}

func TestGatewayRejectsExplicitInvalidZeroMetadata(t *testing.T) {
	for _, tc := range []struct {
		field string
		value any
	}{{"status", 0}, {"code", ""}, {"requestId", ""}} {
		var m map[string]any
		_ = json.Unmarshal(fixture(t, "search-success.json"), &m)
		if tc.field == "requestId" {
			m["results"].([]any)[0].(map[string]any)["provenance"].(map[string]any)[tc.field] = tc.value
		} else {
			m["attempts"].([]any)[0].(map[string]any)[tc.field] = tc.value
		}
		b, _ := json.Marshal(m)
		var out Response
		requireCode(t, decodeResponse(b, &out), InvalidResponse)
	}
}
