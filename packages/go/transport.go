package searchsdk

import (
	"bytes"
	"compress/gzip"
	"context"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const defaultLimit int64 = 10 * 1024 * 1024
const defaultTimeout = 10 * time.Second

// HTTPOptions never accepts an http.Client: the SDK owns redirect and cookie
// policy. Inject a concurrency-safe RoundTripper for tests or private networking.
type HTTPOptions struct {
	Transport        http.RoundTripper
	Timeout          time.Duration
	MaxResponseBytes int64
	MaxConcurrency   int
}
type wire struct {
	client  *http.Client
	timeout time.Duration
	limit   int64
	slots   chan struct{}
}

func newWire(o HTTPOptions) (*wire, error) {
	if o.Timeout < 0 || o.MaxResponseBytes < 0 || o.MaxResponseBytes == 1<<63-1 || o.MaxConcurrency < 0 || o.MaxConcurrency > 64 {
		return nil, fail(Configuration)
	}
	if o.Timeout == 0 {
		o.Timeout = defaultTimeout
	}
	if o.MaxResponseBytes == 0 {
		o.MaxResponseBytes = defaultLimit
	}
	if o.MaxConcurrency == 0 {
		o.MaxConcurrency = 8
	}
	tr := o.Transport
	if tr == nil {
		tr = http.DefaultTransport
	}
	return &wire{client: &http.Client{Transport: tr, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}, timeout: o.Timeout, limit: o.MaxResponseBytes, slots: make(chan struct{}, o.MaxConcurrency)}, nil
}
func endpoint(s string) (*url.URL, error) {
	u, e := url.Parse(s)
	if e != nil || !validURL(s) || u.Scheme != "https" || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" || strings.ContainsAny(s, "?#") {
		return nil, fail(Configuration)
	}
	return u, nil
}
func token(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < 33 || r > 126 {
			return false
		}
	}
	return true
}
func copyHeaders(h http.Header) (http.Header, error) {
	out := make(http.Header)
	if len(h) > 64 {
		return nil, fail(InvalidRequest)
	}
	for k, vs := range h {
		if !token(k) || strings.ContainsAny(k, "()<>@,;:\\\"/[]?={} \t") {
			return nil, fail(InvalidRequest)
		}
		switch strings.ToLower(k) {
		case "cookie", "host", "connection", "content-length", "transfer-encoding", "proxy-authorization", "proxy-connection":
			return nil, fail(InvalidRequest)
		}
		for _, v := range vs {
			if len(v) > 8192 || strings.ContainsAny(v, "\r\n\x00") {
				return nil, fail(InvalidRequest)
			}
			for _, c := range []byte(v) {
				if c < 32 && c != '\t' || c == 127 {
					return nil, fail(InvalidRequest)
				}
			}
			out.Add(k, v)
		}
	}
	return out, nil
}
func (w *wire) acquire(ctx context.Context) error {
	if ctx.Err() != nil {
		return contextError(ctx)
	}
	select {
	case w.slots <- struct{}{}:
		if ctx.Err() != nil {
			<-w.slots
			return contextError(ctx)
		}
		return nil
	case <-ctx.Done():
		return contextError(ctx)
	}
}
func (w *wire) release() { <-w.slots }

// An opaque, non-rewindable body prevents net/http from invisibly replaying a
// request on a stale pooled connection. In particular, Idempotency-Key must not
// turn a native mutation into an automatic transport retry. SDK retry policy
// alone decides whether to create another request. Empty GET bodies are probed
// and omitted by net/http's transfer writer.
func wireRequest(ctx context.Context, method, target string, b []byte) (*http.Request, error) {
	r, err := http.NewRequestWithContext(ctx, method, target, io.NopCloser(bytes.NewReader(b)))
	if err == nil {
		r.ContentLength = int64(len(b))
		r.GetBody = nil
	}
	return r, err
}
func readCapped(ctx context.Context, resp *http.Response, limit int64) ([]byte, error) {
	defer resp.Body.Close()
	stop := context.AfterFunc(ctx, func() { resp.Body.Close() })
	defer stop()
	var reader io.Reader = resp.Body
	enc := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Encoding")))
	if enc != "" && enc != "identity" {
		if enc != "gzip" {
			return nil, fail(InvalidResponse)
		}
		g, e := gzip.NewReader(resp.Body)
		if e != nil {
			if ctx.Err() != nil {
				return nil, contextError(ctx)
			}
			return nil, fail(InvalidResponse)
		}
		defer g.Close()
		reader = g
	}
	b, e := io.ReadAll(io.LimitReader(reader, limit+1))
	if ctx.Err() != nil {
		return nil, contextError(ctx)
	}
	if int64(len(b)) > limit {
		return nil, fail(InvalidResponse)
	}
	if e != nil {
		return nil, fail(Network)
	}
	return b, nil
}
func (w *wire) send(ctx context.Context, method, target string, h http.Header, b []byte) (*http.Response, error) {
	if ctx.Err() != nil {
		return nil, contextError(ctx)
	}
	req, e := wireRequest(ctx, method, target, b)
	if e != nil {
		return nil, fail(InvalidRequest)
	}
	req.Header = h.Clone()
	resp, e := w.client.Do(req)
	if e != nil {
		if resp != nil && resp.Body != nil {
			resp.Body.Close()
		}
		if ctx.Err() != nil {
			return nil, contextError(ctx)
		}
		return nil, fail(Network)
	}
	if ctx.Err() != nil {
		resp.Body.Close()
		return nil, contextError(ctx)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		defer resp.Body.Close()
		e := statusError(resp.StatusCode)
		e.RetryAfterMS = parseRetryAfter(resp.Header.Get("Retry-After"))
		return nil, e
	}
	return resp, nil
}
func (w *wire) json(ctx context.Context, method, target string, h http.Header, b []byte) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(ctx, w.timeout)
	defer cancel()
	if e := w.acquire(ctx); e != nil {
		return nil, e
	}
	defer w.release()
	resp, e := w.send(ctx, method, target, h, b)
	if e != nil {
		return nil, e
	}
	raw, e := readCapped(ctx, resp, w.limit)
	if e != nil {
		return nil, e
	}
	var m map[string]any
	if decodeJSON(raw, &m) != nil || m == nil {
		return nil, fail(InvalidResponse)
	}
	if ctx.Err() != nil {
		return nil, contextError(ctx)
	}
	return m, nil
}
func parseRetryAfter(s string) *float64 {
	if s == "" {
		return nil
	}
	if n, e := strconv.ParseFloat(strings.TrimSpace(s), 64); e == nil && finite(n) && n >= 0 && n <= float64(1<<53)/1000 {
		n *= 1000
		return &n
	}
	if t, e := http.ParseTime(s); e == nil {
		n := float64(time.Until(t)) / float64(time.Millisecond)
		if n < 0 {
			n = 0
		}
		return &n
	}
	return nil
}
func cleanError(err error) *Error {
	var e *Error
	if errors.As(err, &e) && e != nil && validCode(e.Code) {
		v := *e
		v.Attempts = append([]Attempt{}, e.Attempts...)
		if v.Status < 100 || v.Status > 599 {
			v.Status = 0
		}
		if v.RetryAfterMS != nil && (!finite(*v.RetryAfterMS) || *v.RetryAfterMS < 0) {
			v.RetryAfterMS = nil
		}
		return &v
	}
	return fail(ProviderError)
}
func retryWait(ctx context.Context, p RetryPolicy, index int, e *Error) error {
	d := p.BaseDelay
	for i := 0; i < index && d < p.MaxDelay; i++ {
		if d > p.MaxDelay/2 {
			d = p.MaxDelay
		} else {
			d *= 2
		}
	}
	if d > p.MaxDelay {
		d = p.MaxDelay
	}
	if e.RetryAfterMS != nil {
		ms := *e.RetryAfterMS
		if ms > float64((1<<63-1)/int64(time.Millisecond)) {
			if deadline, ok := ctx.Deadline(); ok {
				d = time.Until(deadline) + time.Millisecond
			} else {
				return fail(Timeout)
			}
		} else if r := time.Duration(ms * float64(time.Millisecond)); r > d {
			d = r
		}
	}
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return contextError(ctx)
	case <-timer.C:
		return nil
	}
}
