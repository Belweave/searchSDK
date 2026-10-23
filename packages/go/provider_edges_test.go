package searchsdk

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestEveryNormalizedAdapterRejectsMalformedFields(t *testing.T) {
	var fixtures struct {
		Cases []struct {
			Provider         string
			UpstreamResponse json.RawMessage
		}
	}
	_ = json.Unmarshal(fixture(t, "providers.json"), &fixtures)
	seen := map[string]bool{}
	for _, f := range fixtures.Cases {
		if seen[f.Provider] {
			continue
		}
		seen[f.Provider] = true
		for _, field := range []string{"title", "url", "score", "requestID"} {
			t.Run(f.Provider+"/"+field, func(t *testing.T) {
				var root map[string]any
				_ = json.Unmarshal(f.UpstreamResponse, &root)
				rows := root["results"]
				switch f.Provider {
				case "brave":
					rows = root["web"].(map[string]any)["results"]
				case "you":
					rows = root["results"].(map[string]any)["web"]
				case "firecrawl":
					rows = root["data"].(map[string]any)["web"]
				case "serper":
					rows = root["organic"]
				case "serpapi":
					rows = root["organic_results"]
				}
				row := rows.([]any)[0].(map[string]any)
				switch field {
				case "title":
					if f.Provider == "linkup" {
						row["name"] = false
					} else {
						row["title"] = false
					}
				case "url":
					if f.Provider == "serper" || f.Provider == "serpapi" {
						row["link"] = "https://user:secret@example.org"
					} else {
						row["url"] = "https://user:secret@example.org"
					}
				case "score":
					switch f.Provider {
					case "exa", "tavily", "searxng":
						row["score"] = "not-a-number"
					case "valyu":
						row["relevance_score"] = "not-a-number"
					case "parallel":
						row["excerpts"] = []any{false}
					case "brave":
						row["extra_snippets"] = []any{false}
					case "you":
						row["snippets"] = []any{false}
					default:
						row["url"] = 7
						row["link"] = 7
					}
				case "requestID":
					switch f.Provider {
					case "context", "tavily":
						root["request_id"] = "secret\n"
					case "exa":
						root["requestId"] = "secret\n"
					case "perplexity", "firecrawl":
						root["id"] = "secret\n"
					case "parallel":
						root["search_id"] = "secret\n"
					case "valyu":
						root["tx_id"] = "secret\n"
					case "serpapi":
						root["search_metadata"].(map[string]any)["id"] = "secret\n"
					case "you":
						root["metadata"] = map[string]any{"search_uuid": "secret\n"}
					default:
						if f.Provider == "linkup" {
							row["name"] = false
						} else {
							row["title"] = false
						}
					}
				}
				b, _ := json.Marshal(root)
				o := AdapterOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) { return wireResponse(200, b), nil })}}
				if f.Provider == "searxng" {
					o.SearxNG = &SearxNGOptions{BaseURL: "https://searxng.example"}
				}
				a, e := NewAdapter(f.Provider, o)
				if e != nil {
					t.Fatal(e)
				}
				_, e = a.Search(context.Background(), Request{Query: "x"})
				requireCode(t, e, InvalidResponse)
			})
		}
	}
	if len(seen) != 14 {
		t.Fatal("provider count")
	}
}
func TestProviderSpecialEmptyAndErrorSemantics(t *testing.T) {
	cases := []struct {
		provider, raw string
		code          Code
		results       int
	}{
		{"brave", `{"query":{"original":"x"}}`, "", 0}, {"brave", `{}`, InvalidResponse, 0},
		{"you", `{"results":{"news":[]}}`, "", 0}, {"you", `{"results":{}}`, InvalidResponse, 0},
		{"serpapi", `{"search_metadata":{"status":"Success"},"error":"Google hasn't returned any results for this query.","search_information":{"total_results":0,"organic_results_state":"Fully empty"}}`, "", 0},
		{"serpapi", `{"search_metadata":{"status":"Success"},"error":"upstream secret"}`, ProviderError, 0},
		{"serper", `{"message":"upstream secret"}`, ProviderError, 0}, {"firecrawl", `{"success":false}`, ProviderError, 0}, {"firecrawl", `{"success":true,"data":{"web":[]},"creditsUsed":1.5}`, InvalidResponse, 0},
		{"context", `{"results":[],"partial":null}`, InvalidResponse, 0}, {"context", `{"results":[],"key_metadata":{"credits_consumed":-1}}`, InvalidResponse, 0},
		{"parallel", `{"results":[],"warnings":{}}`, InvalidResponse, 0}, {"valyu", `{"success":false}`, ProviderError, 0}, {"valyu", `{"success":true,"results":[],"warnings":[3]}`, InvalidResponse, 0},
		{"searxng", `{"results":[],"unresponsive_engines":null}`, InvalidResponse, 0},
		{"linkup", `{"results":[{"type":"image","url":"https://example.org"}]}`, InvalidResponse, 0},
	}
	for i, tc := range cases {
		t.Run(fmt.Sprint(i)+tc.provider, func(t *testing.T) {
			var m map[string]any
			_ = json.Unmarshal([]byte(tc.raw), &m)
			v, e := normalizeUpstream(tc.provider, m, time.Now().UTC().Format(time.RFC3339))
			if tc.code != "" {
				requireCode(t, e, tc.code)
			} else if e != nil || len(v.Results) != tc.results {
				t.Fatal(v, e)
			}
		})
	}
}
func TestAdapterSettingsAndCapabilities(t *testing.T) {
	for _, key := range []string{"", "with space", "line\n", "nonasciié"} {
		if _, e := NewAdapter("exa", AdapterOptions{APIKey: key}); e == nil {
			t.Fatal("accepted credential")
		}
	}
	for _, v := range []*ValyuOptions{{MaxPrice: Ptr(-1.0)}, {MaxPrice: Ptr(math.NaN())}, {RelevanceThreshold: Ptr(1.1)}, {ResponseLength: "huge"}, {ResponseLength: 0}, {StartDate: "2026-02-30"}, {StartDate: "2026-03-02", EndDate: "2026-03-01"}, {Instructions: strings.Repeat("x", 501)}} {
		if _, e := NewAdapter("valyu", AdapterOptions{APIKey: "fixture-key", Valyu: v}); e == nil {
			t.Fatal("invalid Valyu settings")
		}
	}
	for _, s := range []*SearxNGOptions{{BaseURL: "http://localhost"}, {BaseURL: "https://example.org", Categories: []string{}}, {BaseURL: "https://example.org", Language: "../en"}, {BaseURL: "https://example.org", SafeSearch: Ptr(3)}, {BaseURL: "https://example.org", Headers: http.Header{"Cookie": {"secret"}}}, {BaseURL: "https://example.org", Headers: http.Header{"Content-Type": {"json"}}}} {
		if _, e := NewAdapter("searxng", AdapterOptions{SearxNG: s}); e == nil {
			t.Fatal("invalid SearXNG settings")
		}
	}
	calls := 0
	a, _ := NewAdapter("context", AdapterOptions{APIKey: "fixture-key", HTTP: HTTPOptions{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		calls++
		return wireResponse(200, []byte(`{"results":[]}`)), nil
	})}})
	_, e := a.Search(context.Background(), Request{Query: strings.Repeat("😀", 251)})
	requireCode(t, e, UnsupportedOption)
	if calls != 0 {
		t.Fatal("UTF16 query ceiling ignored")
	}
	ds := []string{}
	for i := 0; i < 101; i++ {
		ds = append(ds, fmt.Sprintf("d%d.example.org", i))
	}
	_, e = a.Search(context.Background(), Request{Query: "x", IncludeDomains: ds})
	requireCode(t, e, UnsupportedOption)
	a, _ = NewAdapter("perplexity", AdapterOptions{APIKey: "fixture-key"})
	_, e = a.Search(context.Background(), Request{Query: "x", IncludeDomains: []string{"example.org"}, ExcludeDomains: []string{"example.net"}})
	requireCode(t, e, UnsupportedOption)
}
