// This example uses an injected deterministic fixture, never a paid provider.
package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	searchsdk "github.com/Belweave/searchSDK/packages/go"
)

type fixtureTransport struct{}

func (fixtureTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	if r.URL.String() != "https://api.exa.ai/search" {
		panic("unexpected fixture endpoint")
	}
	return &http.Response{StatusCode: http.StatusOK, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(`{"results":[{"url":"https://example.org/docs","title":"Synthetic fixture","highlights":["Local fixture only"]}]}`))}, nil
}
func main() {
	provider, err := searchsdk.NewAdapter("exa", searchsdk.AdapterOptions{APIKey: "fixture-key", HTTP: searchsdk.HTTPOptions{Transport: fixtureTransport{}}})
	if err != nil {
		panic(err)
	}
	client, err := searchsdk.New(searchsdk.Config{Provider: provider})
	if err != nil {
		panic(err)
	}
	result, err := client.Search(context.Background(), searchsdk.Request{Query: "search SDK", Limit: 3})
	if err != nil {
		panic(err)
	}
	fmt.Printf("%s: %d result, provenance=%s\n", result.Provider, len(result.Results), result.Results[0].Provenance.Provider)
}
