package searchsdk

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

// Gateway calls the exact application-owned HTTPS endpoint. Use it from mobile
// applications; never distribute provider credentials to clients.
type Gateway struct {
	endpoint string
	wire     *wire
}

func NewGateway(exactEndpoint string, o HTTPOptions) (*Gateway, error) {
	if _, e := endpoint(exactEndpoint); e != nil {
		return nil, e
	}
	w, e := newWire(o)
	if e != nil {
		return nil, e
	}
	return &Gateway{endpoint: exactEndpoint, wire: w}, nil
}
func (g *Gateway) Search(ctx context.Context, r Request) (Response, error) {
	return g.SearchWithToken(ctx, r, "")
}

// SearchWithToken accepts a short-lived application token for this request only.
// Gateway POSTs are never retried or redirected.
func (g *Gateway) SearchWithToken(ctx context.Context, r Request, accessToken string) (Response, error) {
	var out Response
	r, e := ValidateRequest(r)
	if e != nil {
		return out, e
	}
	if accessToken != "" && !token(accessToken) {
		return out, fail(InvalidRequest)
	}
	ctx, cancel := context.WithTimeout(ctx, g.wire.timeout)
	defer cancel()
	if e = g.wire.acquire(ctx); e != nil {
		return out, e
	}
	defer g.wire.release()
	b, e := json.Marshal(r)
	if e != nil {
		return out, fail(InvalidRequest)
	}
	h := http.Header{"Content-Type": {"application/json"}, "Accept": {"application/json"}}
	if accessToken != "" {
		h.Set("Authorization", "Bearer "+accessToken)
	}
	// Read non-success bodies here to validate the sanitized protocol envelope.
	req, e := wireRequest(ctx, "POST", g.endpoint, b)
	if e != nil {
		return out, fail(Configuration)
	}
	req.Header = h
	resp, e := g.wire.client.Do(req)
	if e != nil {
		if resp != nil && resp.Body != nil {
			resp.Body.Close()
		}
		if ctx.Err() != nil {
			return out, contextError(ctx)
		}
		return out, fail(Network)
	}
	versions := []string{}
	for name, values := range resp.Header {
		if strings.EqualFold(name, "X-SearchSDK-Protocol") {
			versions = append(versions, values...)
		}
	}
	if len(versions) > 0 && (len(versions) != 1 || versions[0] != "1") {
		resp.Body.Close()
		return out, fail(InvalidResponse)
	}
	raw, readErr := readCapped(ctx, resp, g.wire.limit)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		se := statusError(resp.StatusCode)
		se.RetryAfterMS = parseRetryAfter(resp.Header.Get("Retry-After"))
		if ctx.Err() != nil {
			return out, contextError(ctx)
		}
		if readErr == nil {
			if parsed, ok := parseGatewayError(raw); ok {
				return out, parsed
			}
		}
		return out, se
	}
	if readErr != nil {
		return out, readErr
	}
	if resp.StatusCode != 200 {
		return out, fail(InvalidResponse)
	}
	if e = decodeResponse(raw, &out); e != nil {
		return Response{}, e
	}
	if ctx.Err() != nil {
		return Response{}, contextError(ctx)
	}
	return out, nil
}
func parseGatewayError(b []byte) (*Error, bool) {
	var m map[string]json.RawMessage
	if decodeJSON(b, &m) != nil || !requiredJSON(m, "error") {
		return nil, false
	}
	var env map[string]json.RawMessage
	if decodeJSON(m["error"], &env) != nil || !requiredJSON(env, "code", "attempts") {
		return nil, false
	}
	var e Error
	if decodeJSON(m["error"], &e) != nil || !validCode(e.Code) || validateAttempts(e.Attempts) != nil {
		return nil, false
	}
	// A present null optional status/delay is malformed, not the zero value.
	if s, ok := env["status"]; ok {
		var n int
		if decodeJSON(s, &n) != nil || n < 100 || n > 599 {
			return nil, false
		}
	}
	if s, ok := env["retryAfterMs"]; ok {
		var n *float64
		if decodeJSON(s, &n) != nil || n == nil || !finite(*n) || *n < 0 {
			return nil, false
		}
	}
	if !strictAttemptShapes(env["attempts"]) {
		return nil, false
	}
	return cleanError(&e), true
}
func strictAttemptShapes(b []byte) bool {
	var rows []map[string]json.RawMessage
	if decodeJSON(b, &rows) != nil || rows == nil {
		return false
	}
	for _, a := range rows {
		if !requiredJSON(a, "provider", "startedAt", "durationMs", "outcome") {
			return false
		}
		for _, k := range []string{"code", "status", "retryAfterMs"} {
			if _, ok := a[k]; ok && !requiredJSON(a, k) {
				return false
			}
		}
		if b, present := a["code"]; present {
			var code Code
			if decodeJSON(b, &code) != nil || !validCode(code) {
				return false
			}
		}
		if b, present := a["status"]; present {
			var status int
			if decodeJSON(b, &status) != nil || status < 100 || status > 599 {
				return false
			}
		}
	}
	return true
}
func decodeResponse(b []byte, out *Response) error {
	var m map[string]json.RawMessage
	if decodeJSON(b, &m) != nil || !requiredJSON(m, "provider", "results", "warnings", "attempts") {
		return fail(InvalidResponse)
	}
	if _, ok := m["usage"]; !ok {
		return fail(InvalidResponse)
	}
	if decodeJSON(b, out) != nil || !providerPattern.MatchString(out.Provider) || validateProvider(out.ProviderResponse) != nil || validateAttempts(out.Attempts) != nil || !strictAttemptShapes(m["attempts"]) {
		return fail(InvalidResponse)
	}
	if _, ok := m["reuse"]; ok {
		if !requiredJSON(m, "reuse") || out.Reuse != "cache" && out.Reuse != "inflight" {
			return fail(InvalidResponse)
		}
	}
	var results []map[string]json.RawMessage
	_ = json.Unmarshal(m["results"], &results)
	for _, r := range results {
		if highlight, ok := r["highlights"]; ok && string(highlight) != "null" {
			var a []any
			if decodeJSON(highlight, &a) != nil {
				return fail(InvalidResponse)
			}
			for _, v := range a {
				if _, ok := v.(string); !ok {
					return fail(InvalidResponse)
				}
			}
		}
		if !requiredJSON(r, "url", "provenance") {
			return fail(InvalidResponse)
		}
		var p map[string]json.RawMessage
		if decodeJSON(r["provenance"], &p) != nil || !requiredJSON(p, "provider", "sourceUrl", "retrievedAt") {
			return fail(InvalidResponse)
		}
		if b, present := p["requestId"]; present && string(b) != "null" {
			var id string
			if decodeJSON(b, &id) != nil || !idPattern.MatchString(id) {
				return fail(InvalidResponse)
			}
		}
	}
	if out.Usage != nil {
		var u map[string]json.RawMessage
		if decodeJSON(m["usage"], &u) != nil || !requiredJSON(u, "unit", "value") {
			return fail(InvalidResponse)
		}
	}
	var warnings []map[string]json.RawMessage
	_ = json.Unmarshal(m["warnings"], &warnings)
	for _, w := range warnings {
		if !requiredJSON(w, "code", "provider") {
			return fail(InvalidResponse)
		}
	}
	return nil
}
