package searchsdk

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func wireResponse(status int, b []byte) *http.Response {
	return &http.Response{StatusCode: status, Header: make(http.Header), Body: io.NopCloser(bytes.NewReader(b))}
}
func fixture(t *testing.T, name string) []byte {
	t.Helper()
	b, e := os.ReadFile(filepath.Join("testdata", name))
	if e != nil {
		t.Fatal(e)
	}
	if source, e := os.ReadFile(filepath.Join("..", "..", "sdk-contract", "fixtures", name)); e == nil && !bytes.Equal(source, b) {
		t.Fatal("packaged fixture differs from shared contract", name)
	}
	return b
}
func requireCode(t *testing.T, e error, c Code) {
	t.Helper()
	se, ok := e.(*Error)
	if !ok || se.Code != c {
		t.Fatalf("got %T %v, want %s", e, e, c)
	}
	if strings.Contains(e.Error(), "secret") || strings.Contains(e.Error(), "fixture-key") {
		t.Fatal("credential disclosure")
	}
}
func jsonEqual(t *testing.T, a, b any) {
	t.Helper()
	aa, _ := json.Marshal(a)
	bb, _ := json.Marshal(b)
	var av, bv any
	if json.Unmarshal(aa, &av) != nil || json.Unmarshal(bb, &bv) != nil || !reflect.DeepEqual(av, bv) {
		t.Fatalf("JSON differs\n got %s\nwant %s", aa, bb)
	}
}
func TestRequestContract(t *testing.T) {
	var c struct {
		Valid, Invalid []struct {
			Name              string
			Input, Normalized json.RawMessage
		}
	}
	if e := json.Unmarshal(fixture(t, "request-cases.json"), &c); e != nil {
		t.Fatal(e)
	}
	for _, x := range c.Valid {
		t.Run(x.Name, func(t *testing.T) {
			r, e := ParseRequest(x.Input)
			if e != nil {
				t.Fatal(e)
			}
			jsonEqual(t, r, x.Normalized)
		})
	}
	for _, x := range c.Invalid {
		t.Run(x.Name, func(t *testing.T) { _, e := ParseRequest(x.Input); requireCode(t, e, InvalidRequest) })
	}
}
func TestAllNormalizedGoldenWires(t *testing.T) {
	var c struct {
		Credential, CanonicalRetrievalTime string
		Cases                              []struct {
			Name, Provider  string
			Capabilities    Capabilities
			Request         Request
			UpstreamRequest struct {
				URL, Method string
				Query       map[string]string
				Headers     map[string]string
				Body        any
			}
			UpstreamResponse json.RawMessage
			Response         ProviderResponse
		}
	}
	if e := json.Unmarshal(fixture(t, "providers.json"), &c); e != nil {
		t.Fatal(e)
	}
	if len(c.Cases) != 24 {
		t.Fatal("expected 24 cases")
	}
	for _, x := range c.Cases {
		t.Run(x.Name, func(t *testing.T) {
			calls := 0
			o := AdapterOptions{APIKey: c.Credential}
			if x.Provider == "searxng" {
				o.SearxNG = &SearxNGOptions{BaseURL: "https://searxng.example"}
			}
			o.HTTP.Transport = roundTripFunc(func(r *http.Request) (*http.Response, error) {
				calls++
				if r.Method != x.UpstreamRequest.Method {
					t.Errorf("method %s", r.Method)
				}
				u := *r.URL
				u.RawQuery = ""
				if u.String() != x.UpstreamRequest.URL {
					t.Errorf("URL %s want %s", u.String(), x.UpstreamRequest.URL)
				}
				query := map[string]string{}
				for k, v := range r.URL.Query() {
					if len(v) != 1 {
						t.Fatal("query duplicates")
					}
					query[k] = v[0]
				}
				jsonEqual(t, query, x.UpstreamRequest.Query)
				for k, v := range x.UpstreamRequest.Headers {
					if r.Header.Get(k) != v {
						t.Errorf("header %s", k)
					}
				}
				if r.Header.Get("Cookie") != "" {
					t.Fatal("ambient cookie")
				}
				b, _ := io.ReadAll(r.Body)
				var body any
				if strings.HasPrefix(r.Header.Get("Content-Type"), "application/x-www-form-urlencoded") {
					r.Body = io.NopCloser(bytes.NewReader(b))
					if e := r.ParseForm(); e != nil {
						t.Fatal(e)
					}
					form := map[string]string{}
					for k, v := range r.PostForm {
						form[k] = v[0]
					}
					body = form
				} else if len(b) > 0 {
					if e := json.Unmarshal(b, &body); e != nil {
						t.Fatal(e)
					}
				}
				jsonEqual(t, body, x.UpstreamRequest.Body)
				return wireResponse(200, x.UpstreamResponse), nil
			})
			a, e := NewAdapter(x.Provider, o)
			if e != nil {
				t.Fatal(e)
			}
			jsonEqual(t, a.Capabilities(), x.Capabilities)
			v, e := a.Search(context.Background(), x.Request)
			if e != nil {
				t.Fatal(e)
			}
			for i := range v.Results {
				v.Results[i].Provenance.RetrievedAt = c.CanonicalRetrievalTime
			}
			jsonEqual(t, v, x.Response)
			if calls != 1 {
				t.Fatal(calls)
			}
		})
	}
}
func TestGatewayContract(t *testing.T) {
	b := fixture(t, "search-success.json")
	tr := roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.URL.String() != "https://app.example/exact" || r.Method != "POST" || r.Header.Get("Authorization") != "Bearer app-token" {
			t.Fatal("gateway request")
		}
		res := wireResponse(200, b)
		res.Header.Set("X-SearchSDK-Protocol", "1")
		return res, nil
	})
	g, e := NewGateway("https://app.example/exact", HTTPOptions{Transport: tr})
	if e != nil {
		t.Fatal(e)
	}
	r, e := g.SearchWithToken(context.Background(), Request{Query: "search"}, "app-token")
	if e != nil {
		t.Fatal(e)
	}
	jsonEqual(t, r, json.RawMessage(b))
	var cases []struct {
		HTTPStatus int
		Body       json.RawMessage
	}
	_ = json.Unmarshal(fixture(t, "search-errors.json"), &cases)
	for _, x := range cases {
		var env struct{ Error Error }
		_ = json.Unmarshal(x.Body, &env)
		g, _ := NewGateway("https://app.example/exact", HTTPOptions{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) { return wireResponse(x.HTTPStatus, x.Body), nil })})
		_, e := g.Search(context.Background(), Request{Query: "search"})
		requireCode(t, e, env.Error.Code)
	}
}

func TestIntegralJSONLimitAndExplicitProtocolHeaders(t *testing.T) {
	r, e := ParseRequest([]byte(`{"query":"x","limit":5.0}`))
	if e != nil || r.Limit != 5 {
		t.Fatal(r, e)
	}
	for _, values := range [][]string{{""}, {"1", "2"}, {"1", "1"}} {
		g, _ := NewGateway("https://app.example/exact", HTTPOptions{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			res := wireResponse(200, fixture(t, "search-success.json"))
			res.Header["x-searchsdk-protocol"] = values
			return res, nil
		})})
		_, e = g.Search(context.Background(), Request{Query: "x"})
		requireCode(t, e, InvalidResponse)
	}
}
