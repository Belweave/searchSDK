package searchsdk

import (
	"bytes"
	"encoding/json"
	"io"
	"math"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode"
	"unicode/utf16"
	"unicode/utf8"
)

var providerPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,64}$`)
var idPattern = regexp.MustCompile(`^[a-zA-Z0-9_.:/-]{1,256}$`)
var domainLabel = regexp.MustCompile(`^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$`)

func finite(v float64) bool { return !math.IsNaN(v) && !math.IsInf(v, 0) }
func normalizeDomains(ds []string) ([]string, error) {
	if ds == nil {
		return nil, nil
	}
	if len(ds) == 0 {
		return nil, fail(InvalidRequest)
	}
	out := []string{}
	seen := map[string]bool{}
	for _, d := range ds {
		parts := strings.Split(d, ".")
		if len(d) > 253 || len(parts) < 2 {
			return nil, fail(InvalidRequest)
		}
		for _, p := range parts {
			if !domainLabel.MatchString(p) {
				return nil, fail(InvalidRequest)
			}
		}
		d = strings.ToLower(d)
		if !seen[d] {
			out = append(out, d)
			seen[d] = true
		}
	}
	return out, nil
}
func ValidateRequest(r Request) (Request, error) {
	if !utf8.ValidString(r.Query) || strings.TrimSpace(r.Query) == "" || r.Limit < 0 || r.Limit > 20 {
		return r, fail(InvalidRequest)
	}
	if r.Limit == 0 {
		r.Limit = 5
	}
	var err error
	r.IncludeDomains, err = normalizeDomains(r.IncludeDomains)
	if err != nil {
		return r, err
	}
	r.ExcludeDomains, err = normalizeDomains(r.ExcludeDomains)
	if err != nil {
		return r, err
	}
	for _, a := range r.IncludeDomains {
		for _, b := range r.ExcludeDomains {
			if a == b {
				return r, fail(InvalidRequest)
			}
		}
	}
	return r, nil
}

// ParseRequest validates untrusted JSON, including unknown fields, nulls and an
// explicitly supplied zero limit, before constructing a typed Request.
func ParseRequest(b []byte) (Request, error) {
	var r Request
	var m map[string]json.RawMessage
	if decodeJSON(b, &m) != nil || m == nil {
		return r, fail(InvalidRequest)
	}
	for k, v := range m {
		if k != "query" && k != "limit" && k != "includeDomains" && k != "excludeDomains" || bytes.Equal(bytes.TrimSpace(v), []byte("null")) {
			return r, fail(InvalidRequest)
		}
	}
	if _, ok := m["query"]; !ok {
		return r, fail(InvalidRequest)
	}
	// JSON has one number type: a lexical 5.0 is still an integer limit.
	var fields struct {
		Query          string   `json:"query"`
		IncludeDomains []string `json:"includeDomains"`
		ExcludeDomains []string `json:"excludeDomains"`
	}
	if decodeJSON(b, &fields) != nil {
		return r, fail(InvalidRequest)
	}
	r.Query, r.IncludeDomains, r.ExcludeDomains = fields.Query, fields.IncludeDomains, fields.ExcludeDomains
	if raw, ok := m["limit"]; ok {
		var n float64
		if decodeJSON(raw, &n) != nil || !finite(n) || n != math.Trunc(n) || n < 1 || n > 20 {
			return r, fail(InvalidRequest)
		}
		r.Limit = int(n)
	}
	return ValidateRequest(r)
}
func checkCapabilities(r Request, c Capabilities) error {
	if (len(r.IncludeDomains) > 0 || len(r.ExcludeDomains) > 0) && !c.DomainFilters || len(r.IncludeDomains) > c.MaxIncludeDomains || len(r.ExcludeDomains) > c.MaxExcludeDomains || c.MutuallyExclusiveDomainFilters && len(r.IncludeDomains) > 0 && len(r.ExcludeDomains) > 0 || c.MaxQueryLength > 0 && len(utf16.Encode([]rune(r.Query))) > c.MaxQueryLength {
		return fail(UnsupportedOption)
	}
	return nil
}
func validURL(s string) bool {
	if !utf8.ValidString(s) || strings.ContainsAny(s, "\\") || strings.IndexFunc(s, func(r rune) bool { return unicode.IsSpace(r) || r < 33 || r >= 127 && r <= 159 }) >= 0 {
		return false
	}
	u, e := url.Parse(s)
	return e == nil && (u.Scheme == "https" || u.Scheme == "http") && u.Hostname() != "" && u.User == nil && u.Opaque == "" && strings.HasPrefix(strings.ToLower(s), u.Scheme+"://")
}
func validTime(s string) bool { _, e := time.Parse(time.RFC3339Nano, s); return e == nil }
func validateProvider(r ProviderResponse) error {
	if r.Results == nil || r.Warnings == nil {
		return fail(InvalidResponse)
	}
	for _, v := range r.Results {
		p := v.Provenance
		if !validURL(v.URL) || !validURL(p.SourceURL) || !providerPattern.MatchString(p.Provider) || !validTime(p.RetrievedAt) || p.RequestID != "" && !idPattern.MatchString(p.RequestID) || v.Score != nil && !finite(*v.Score) {
			return fail(InvalidResponse)
		}
	}
	if r.Usage != nil && (r.Usage.Unit != "usd" && r.Usage.Unit != "credits" || !finite(r.Usage.Value) || r.Usage.Value < 0) {
		return fail(InvalidResponse)
	}
	for _, w := range r.Warnings {
		if w.Code != "provider_warning" && w.Code != "fallback_used" || !providerPattern.MatchString(w.Provider) {
			return fail(InvalidResponse)
		}
	}
	return nil
}
func validateAttempts(as []Attempt) error {
	if as == nil {
		return fail(InvalidResponse)
	}
	for _, a := range as {
		if !providerPattern.MatchString(a.Provider) || !validTime(a.StartedAt) || !finite(a.DurationMS) || a.DurationMS < 0 || a.Outcome != "success" && a.Outcome != "error" || a.Code != "" && !validCode(a.Code) || a.Status != 0 && (a.Status < 100 || a.Status > 599) || a.RetryAfterMS != nil && (!finite(*a.RetryAfterMS) || *a.RetryAfterMS < 0) {
			return fail(InvalidResponse)
		}
	}
	return nil
}
func decodeJSON(b []byte, v any) error {
	if !utf8.Valid(b) {
		return fail(InvalidResponse)
	}
	d := json.NewDecoder(bytes.NewReader(b))
	if e := d.Decode(v); e != nil {
		return fail(InvalidResponse)
	}
	if d.Decode(new(any)) != io.EOF {
		return fail(InvalidResponse)
	}
	return nil
}

// requiredJSON rejects missing and null consumed fields before typed decoding.
func requiredJSON(m map[string]json.RawMessage, keys ...string) bool {
	for _, k := range keys {
		v, ok := m[k]
		if !ok || bytes.Equal(bytes.TrimSpace(v), []byte("null")) {
			return false
		}
	}
	return true
}
