package searchsdk

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf16"
)

// AdapterOptions configures server-side normalized search. APIKey is required
// except for operator-selected SearXNG instances.
type AdapterOptions struct {
	APIKey  string
	HTTP    HTTPOptions
	SearxNG *SearxNGOptions
	Valyu   *ValyuOptions
}
type SearxNGOptions struct {
	BaseURL    string
	Headers    http.Header
	Language   string
	SafeSearch *int
	TimeRange  string
	Categories []string
}
type ValyuOptions struct {
	MaxPrice           *float64
	RelevanceThreshold *float64
	// ResponseLength accepts a documented string or positive integer.
	ResponseLength                   any
	FastMode                         *bool
	StartDate, EndDate, Instructions string
}
type Adapter struct {
	id, key, target string
	caps            Capabilities
	wire            *wire
	headers         http.Header
	settings        map[string]any
	form            url.Values
}

func (a *Adapter) ID() string                 { return a.id }
func (a *Adapter) Capabilities() Capabilities { return a.caps }

// NewAdapter selects one of the 14 explicitly supported normalized providers.
// WonderSearch is corpus-native only and is not a normalized web provider.
func NewAdapter(id string, o AdapterOptions) (*Adapter, error) {
	w, e := newWire(o.HTTP)
	if e != nil {
		return nil, e
	}
	a := &Adapter{id: id, key: o.APIKey, wire: w, headers: make(http.Header), settings: map[string]any{}}
	if id != "searxng" && !token(o.APIKey) {
		return nil, fail(Configuration)
	}
	if id != "searxng" && o.SearxNG != nil || id != "valyu" && o.Valyu != nil {
		return nil, fail(Configuration)
	}
	a.headers.Set("Content-Type", "application/json")
	domain := func(i, j, q int, exclusive bool) {
		a.caps = Capabilities{DomainFilters: true, MaxIncludeDomains: i, MaxExcludeDomains: j, MaxQueryLength: q, MutuallyExclusiveDomainFilters: exclusive}
	}
	switch id {
	case "context":
		a.target = "https://api.context.dev/v1/web/search"
		domain(100, 100, 500, false)
	case "exa":
		a.target = "https://api.exa.ai/search"
		domain(1200, 1200, 0, false)
	case "tavily":
		a.target = "https://api.tavily.com/search"
		domain(300, 150, 0, false)
	case "tinyfish":
		a.target = "https://api.search.tinyfish.ai/"
		domain(100, 100, 0, false)
	case "brave":
		a.target = "https://api.search.brave.com/res/v1/web/search"
	case "perplexity":
		a.target = "https://api.perplexity.ai/search"
		domain(20, 20, 0, true)
	case "parallel":
		a.target = "https://api.parallel.ai/v1/search"
		domain(200, 200, 0, true)
	case "linkup":
		a.target = "https://api.linkup.so/v1/search"
		domain(100, 50, 0, false)
	case "firecrawl":
		a.target = "https://api.firecrawl.dev/v2/search"
		domain(100, 100, 500, true)
	case "you":
		a.target = "https://ydc-index.io/v1/search"
		domain(500, 5000, 0, true)
	case "serper":
		a.target = "https://google.serper.dev/search"
	case "serpapi":
		a.target = "https://serpapi.com/search.json"
	case "valyu":
		a.target = "https://api.valyu.ai/v1/search"
		domain(100, 100, 0, false)
		if e = a.valyuSettings(o.Valyu); e != nil {
			return nil, e
		}
	case "searxng":
		if e = a.searxSettings(o.SearxNG); e != nil {
			return nil, e
		}
	default:
		return nil, fail(Configuration)
	}
	switch id {
	case "context", "tavily", "perplexity", "linkup", "firecrawl":
		a.headers.Set("Authorization", "Bearer "+o.APIKey)
	case "exa", "parallel", "you", "serper", "tinyfish", "valyu":
		a.headers.Set("X-API-Key", o.APIKey)
	case "brave":
		a.headers.Set("X-Subscription-Token", o.APIKey)
	}
	if id == "tinyfish" || id == "brave" || id == "serpapi" {
		a.headers.Del("Content-Type")
		a.headers.Set("Accept", "application/json")
	}
	if id == "valyu" {
		a.headers.Set("Accept", "application/json")
	}
	return a, nil
}
func (a *Adapter) searxSettings(s *SearxNGOptions) error {
	if s == nil {
		return fail(Configuration)
	}
	u, e := endpoint(s.BaseURL)
	if e != nil {
		return e
	}
	a.target = strings.TrimRight(u.String(), "/") + "/search"
	h, e := copyHeaders(s.Headers)
	if e != nil {
		return fail(Configuration)
	}
	if len(h) > 32 || h.Get("Accept") != "" || h.Get("Content-Type") != "" {
		return fail(Configuration)
	}
	a.headers = h
	a.headers.Set("Accept", "application/json")
	a.headers.Set("Content-Type", "application/x-www-form-urlencoded")
	a.form = url.Values{"format": {"json"}, "pageno": {"1"}}
	if s.Language != "" {
		if !languagePattern.MatchString(s.Language) {
			return fail(Configuration)
		}
		a.form.Set("language", s.Language)
	}
	if s.SafeSearch != nil {
		if *s.SafeSearch < 0 || *s.SafeSearch > 2 {
			return fail(Configuration)
		}
		a.form.Set("safesearch", strconv.Itoa(*s.SafeSearch))
	}
	if s.TimeRange != "" {
		if s.TimeRange != "day" && s.TimeRange != "month" && s.TimeRange != "year" {
			return fail(Configuration)
		}
		a.form.Set("time_range", s.TimeRange)
	}
	cats := s.Categories
	if cats == nil {
		cats = []string{"general"}
	}
	if len(cats) == 0 || len(cats) > 20 {
		return fail(Configuration)
	}
	for _, c := range cats {
		if !categoryPattern.MatchString(c) {
			return fail(Configuration)
		}
	}
	a.form.Set("categories", strings.Join(cats, ","))
	return nil
}
func (a *Adapter) valyuSettings(v *ValyuOptions) error {
	if v == nil {
		return nil
	}
	if v.MaxPrice != nil {
		if !finite(*v.MaxPrice) || *v.MaxPrice <= 0 {
			return fail(Configuration)
		}
		a.settings["max_price"] = *v.MaxPrice
	}
	if v.RelevanceThreshold != nil {
		if !finite(*v.RelevanceThreshold) || *v.RelevanceThreshold < 0 || *v.RelevanceThreshold > 1 {
			return fail(Configuration)
		}
		a.settings["relevance_threshold"] = *v.RelevanceThreshold
	}
	if v.ResponseLength != nil {
		switch n := v.ResponseLength.(type) {
		case string:
			if n != "short" && n != "medium" && n != "large" && n != "max" {
				return fail(Configuration)
			}
		case int:
			if n <= 0 {
				return fail(Configuration)
			}
		default:
			return fail(Configuration)
		}
		a.settings["response_length"] = v.ResponseLength
	}
	if v.FastMode != nil {
		a.settings["fast_mode"] = *v.FastMode
	}
	for k, d := range map[string]string{"start_date": v.StartDate, "end_date": v.EndDate} {
		if d != "" {
			t, e := time.Parse("2006-01-02", d)
			if e != nil || t.Format("2006-01-02") != d {
				return fail(Configuration)
			}
			a.settings[k] = d
		}
	}
	if v.StartDate != "" && v.EndDate != "" && v.StartDate > v.EndDate {
		return fail(Configuration)
	}
	if v.Instructions != "" {
		if strings.TrimSpace(v.Instructions) == "" || len(utf16.Encode([]rune(v.Instructions))) > 500 {
			return fail(Configuration)
		}
		a.settings["instructions"] = v.Instructions
	}
	return nil
}
func (a *Adapter) Search(ctx context.Context, r Request) (ProviderResponse, error) {
	var zero ProviderResponse
	ctx, cancel := context.WithTimeout(ctx, a.wire.timeout)
	defer cancel()
	var e error
	r, e = ValidateRequest(r)
	if e != nil {
		return zero, e
	}
	if e = checkCapabilities(r, a.caps); e != nil {
		return zero, e
	}
	method, target := http.MethodPost, a.target
	body := map[string]any{}
	q := url.Values{}
	domains := func(i, j string) {
		if r.IncludeDomains != nil {
			body[i] = r.IncludeDomains
		}
		if r.ExcludeDomains != nil {
			body[j] = r.ExcludeDomains
		}
	}
	switch a.id {
	case "context":
		body = map[string]any{"query": r.Query, "numResults": max(10, r.Limit)}
		domains("includeDomains", "excludeDomains")
	case "exa":
		body = map[string]any{"query": r.Query, "numResults": r.Limit, "type": "auto", "contents": map[string]any{"highlights": true}}
		domains("includeDomains", "excludeDomains")
	case "tavily":
		body = map[string]any{"query": r.Query, "max_results": r.Limit, "search_depth": "basic", "include_usage": true, "auto_parameters": false, "include_answer": false, "include_raw_content": false}
		domains("include_domains", "exclude_domains")
		if r.IncludeDomains != nil {
			body["include_domains_mode"] = "restrict"
		}
	case "tinyfish":
		method = "GET"
		q.Set("query", r.Query)
		q.Set("domain_type", "web")
		q.Set("page", "0")
		if r.IncludeDomains != nil {
			q.Set("include_domains", strings.Join(r.IncludeDomains, ","))
		}
		if r.ExcludeDomains != nil {
			q.Set("exclude_domains", strings.Join(r.ExcludeDomains, ","))
		}
	case "brave":
		method = "GET"
		q.Set("q", r.Query)
		q.Set("count", strconv.Itoa(r.Limit))
		q.Set("extra_snippets", "true")
	case "perplexity":
		body = map[string]any{"query": r.Query, "max_results": r.Limit, "search_type": "web"}
		if r.IncludeDomains != nil {
			body["search_domain_filter"] = r.IncludeDomains
		}
		if r.ExcludeDomains != nil {
			ds := []string{}
			for _, d := range r.ExcludeDomains {
				ds = append(ds, "-"+d)
			}
			body["search_domain_filter"] = ds
		}
	case "parallel":
		adv := map[string]any{"max_results": r.Limit}
		policy := map[string]any{}
		if r.IncludeDomains != nil {
			policy["include_domains"] = r.IncludeDomains
		}
		if r.ExcludeDomains != nil {
			policy["exclude_domains"] = r.ExcludeDomains
		}
		if len(policy) > 0 {
			adv["source_policy"] = policy
		}
		body = map[string]any{"search_queries": []string{r.Query}, "mode": "basic", "advanced_settings": adv}
	case "linkup":
		body = map[string]any{"q": r.Query, "depth": "fast", "outputType": "searchResults", "includeImages": false, "maxResults": r.Limit}
		domains("includeDomains", "excludeDomains")
	case "firecrawl":
		body = map[string]any{"query": r.Query, "limit": r.Limit, "sources": []any{map[string]any{"type": "web"}}, "highlights": false}
		domains("includeDomains", "excludeDomains")
	case "you":
		body = map[string]any{"query": r.Query, "count": r.Limit}
		domains("include_domains", "exclude_domains")
	case "serper":
		body = map[string]any{"q": r.Query, "num": r.Limit}
	case "serpapi":
		method = "GET"
		q.Set("engine", "google")
		q.Set("q", r.Query)
		q.Set("api_key", a.key)
	case "valyu":
		for k, v := range a.settings {
			body[k] = v
		}
		body["query"] = r.Query
		body["search_type"] = "web"
		body["max_num_results"] = r.Limit
		domains("included_sources", "excluded_sources")
	case "searxng":
		for k, vs := range a.form {
			q[k] = append([]string{}, vs...)
		}
		q.Set("q", r.Query)
	}
	var b []byte
	if method == "GET" {
		target += "?" + q.Encode()
	} else if a.id == "searxng" {
		b = []byte(q.Encode())
	} else {
		b, e = json.Marshal(body)
		if e != nil {
			return zero, fail(InvalidRequest)
		}
	}
	m, e := a.wire.json(ctx, method, target, a.headers, b)
	if e != nil {
		return zero, e
	}
	out, e := normalizeUpstream(a.id, m, time.Now().UTC().Format(time.RFC3339Nano))
	if ctx.Err() != nil {
		return zero, contextError(ctx)
	}
	if e != nil {
		return zero, e
	}
	if e = validateProvider(out); e != nil {
		return zero, e
	}
	if len(out.Results) > r.Limit {
		out.Results = out.Results[:r.Limit]
	}
	return out, nil
}

// rowReader accumulates shape errors without accepting coerced wire fields.
type rowReader struct{ err bool }

func (v *rowReader) obj(x any) map[string]any {
	m, ok := x.(map[string]any)
	if !ok || m == nil {
		v.err = true
	}
	return m
}
func (v *rowReader) rows(x any) []any {
	a, ok := x.([]any)
	if !ok {
		v.err = true
	}
	return a
}
func (v *rowReader) str(x any) *string {
	if x == nil {
		return nil
	}
	s, ok := x.(string)
	if !ok {
		v.err = true
		return nil
	}
	return &s
}
func (v *rowReader) num(x any) *float64 {
	if x == nil {
		return nil
	}
	n, ok := x.(float64)
	if !ok || !finite(n) {
		v.err = true
		return nil
	}
	return &n
}
func (v *rowReader) strs(x any) []string {
	if x == nil {
		return nil
	}
	a := v.rows(x)
	out := []string{}
	for _, s := range a {
		str, ok := s.(string)
		if !ok {
			v.err = true
		} else {
			out = append(out, str)
		}
	}
	return out
}
func normalizeUpstream(id string, m map[string]any, now string) (ProviderResponse, error) {
	v := &rowReader{}
	out := ProviderResponse{Results: []Result{}, Warnings: []Warning{}}
	rows := m["results"]
	snippet, highlights, score, idfield := "", "", "", ""
	warn := false
	usage := func(x any, field, unit string) {
		if x == nil {
			return
		}
		n := v.num(v.obj(x)[field])
		if n != nil {
			if *n < 0 {
				v.err = true
			}
			out.Usage = &Usage{Unit: unit, Value: *n}
		}
	}
	switch id {
	case "context":
		snippet = "description"
		idfield = "request_id"
		if x, ok := m["partial"]; ok {
			b, ok := x.(bool)
			if !ok {
				v.err = true
			}
			warn = b
		}
		usage(m["key_metadata"], "credits_consumed", "credits")
	case "exa":
		highlights = "highlights"
		score = "score"
		idfield = "requestId"
		usage(m["costDollars"], "total", "usd")
		for _, key := range []string{"warnings", "notices"} {
			if a, ok := m[key].([]any); ok && len(a) > 0 {
				warn = true
			}
		}
	case "tavily":
		snippet = "content"
		score = "score"
		idfield = "request_id"
		usage(m["usage"], "credits", "credits")
	case "tinyfish":
		snippet = "snippet"
	case "brave":
		snippet = "description"
		highlights = "extra_snippets"
		if web, ok := m["web"]; ok {
			rows = v.obj(web)["results"]
		} else {
			if _, ok := v.obj(m["query"])["original"].(string); !ok {
				v.err = true
			}
			rows = []any{}
		}
	case "perplexity":
		snippet = "snippet"
		idfield = "id"
	case "parallel":
		highlights = "excerpts"
		idfield = "search_id"
		if x := m["warnings"]; x != nil {
			warn = len(v.rows(x)) > 0
		}
	case "linkup":
		snippet = "content"
	case "firecrawl":
		if m["success"] != true {
			if m["success"] == false {
				return out, fail(ProviderError)
			}
			return out, fail(InvalidResponse)
		}
		rows = v.obj(m["data"])["web"]
		snippet = "description"
		idfield = "id"
		if n := v.num(m["creditsUsed"]); n != nil {
			if *n < 0 || math.Trunc(*n) != *n {
				v.err = true
			}
			out.Usage = &Usage{Unit: "credits", Value: *n}
		}
		w := v.str(m["warning"])
		warn = w != nil && *w != ""
	case "you":
		sections := v.obj(m["results"])
		if x, ok := sections["web"]; ok {
			rows = x
		} else {
			v.rows(sections["news"])
			rows = []any{}
		}
		snippet = "description"
		if meta, ok := m["metadata"]; ok {
			meta = v.obj(meta)
			mID := v.str(meta.(map[string]any)["search_uuid"])
			if mID != nil {
				m["_sdk_id"] = *mID
			}
			idfield = "_sdk_id"
		}
	case "serper":
		if _, ok := m["error"]; ok {
			return out, fail(ProviderError)
		}
		if _, ok := m["message"]; ok && m["organic"] == nil {
			return out, fail(ProviderError)
		}
		rows = m["organic"]
		snippet = "snippet"
		if n := v.num(m["credits"]); n != nil {
			if *n < 0 {
				v.err = true
			}
			out.Usage = &Usage{Unit: "credits", Value: *n}
		}
	case "serpapi":
		meta := v.obj(m["search_metadata"])
		info, _ := m["search_information"].(map[string]any)
		a, arr := m["organic_results"].([]any)
		empty := meta["status"] == "Success" && m["error"] == "Google hasn't returned any results for this query." && info["total_results"] == float64(0) && info["organic_results_state"] == "Fully empty" && (m["organic_results"] == nil || arr && len(a) == 0)
		if _, ok := m["error"]; ok && !empty || meta["status"] == "Error" {
			return out, fail(ProviderError)
		}
		if meta["status"] != "Success" {
			return out, fail(InvalidResponse)
		}
		if empty {
			rows = []any{}
		} else {
			rows = m["organic_results"]
		}
		if rid := v.str(meta["id"]); rid != nil {
			m["_sdk_id"] = *rid
		}
		idfield = "_sdk_id"
		snippet = "snippet"
	case "valyu":
		b, ok := m["success"].(bool)
		if !ok {
			return out, fail(InvalidResponse)
		}
		if !b {
			return out, fail(ProviderError)
		}
		snippet = "content"
		score = "relevance_score"
		idfield = "tx_id"
		usage(m, "total_deduction_dollars", "usd")
		w := v.str(m["error"])
		warn = w != nil && *w != "" || len(v.strs(m["warnings"])) > 0
	case "searxng":
		if _, ok := m["error"]; ok {
			return out, fail(ProviderError)
		}
		snippet = "content"
		score = "score"
		if x, ok := m["unresponsive_engines"]; ok {
			warn = len(v.rows(x)) > 0
		}
	}
	rid := ""
	if idfield != "" {
		if s := v.str(m[idfield]); s != nil {
			rid = *s
			if !idPattern.MatchString(rid) {
				v.err = true
			}
		}
	}
	for _, x := range v.rows(rows) {
		row := v.obj(x)
		urlKey, titleKey := "url", "title"
		if id == "serper" || id == "serpapi" {
			urlKey = "link"
		}
		if id == "linkup" {
			titleKey = "name"
			if t, ok := row["type"]; ok && t != "text" {
				v.err = true
			}
		}
		u := v.str(row[urlKey])
		if u == nil {
			v.err = true
			continue
		}
		r := Result{URL: *u, Title: v.str(row[titleKey]), Provenance: Provenance{Provider: id, SourceURL: *u, RetrievedAt: now, RequestID: rid}}
		if snippet != "" {
			r.Snippet = v.str(row[snippet])
		}
		if highlights != "" {
			r.Highlights = v.strs(row[highlights])
		}
		if score != "" {
			r.Score = v.num(row[score])
		}
		if id == "you" {
			ss := v.strs(row["snippets"])
			if r.Snippet == nil && ss != nil {
				s := strings.Join(ss, "\n")
				r.Snippet = &s
			}
		}
		out.Results = append(out.Results, r)
	}
	if warn {
		out.Warnings = append(out.Warnings, Warning{Code: "provider_warning", Provider: id})
	}
	if v.err {
		return out, fail(InvalidResponse)
	}
	return out, nil
}
