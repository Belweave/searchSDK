# Provider reference attribution

The MIT license in LICENSE covers searchSDK's original implementation. Provider
names, trademarks, public API schemas, schema descriptions and reference material
retain their publishers' ownership and terms; they are not relicensed as original
searchSDK material. No sponsorship or endorsement is implied. Provider account
terms and rights in returned data remain applicable.

Generated native bindings derive from the retained public sources in
`scripts/providers-a` and `scripts/providers-b` in the searchSDK repository,
reviewed 2026-10-22. Every binding in `native_catalog.json` includes its precise
`sourceURL`; generated method comments retain those URLs. `native_sources.json`
records SHA-256 digests for retained inputs, including the provenance manifests
and existing source emitters. Those upstream directories retain any embedded
notices and document transformations/access limits. The Go generator imports
those source models offline through a write overlay and does not modify them.

Primary provider references include:

- Context: https://docs.context.dev/openapi.json and https://docs.context.dev/brand/logo-link.md
- TinyFish: https://agent.tinyfish.ai/v1/openapi/ and https://docs.tinyfish.ai/research-api/reference
- Exa: https://exa.ai/docs/exa-spec.yaml and https://exa.ai/docs/team-management-spec.yaml
- Tavily: https://docs.tavily.com/documentation/api-reference/ and https://docs.tavily.com/documentation/machine-payments/x402.md
- Brave: https://api-dashboard.search.brave.com/app/documentation
- Perplexity: https://docs.perplexity.ai/openapi.json and attributed API reference snapshots
- Parallel: https://docs.parallel.ai/public-openapi.json
- Linkup: https://api.linkup.so/v1/openapi.json
- Firecrawl: https://docs.firecrawl.dev/api-reference/v2-openapi.json
- You: https://you.com/docs/openapi/
- Serper: https://serper.dev/playground
- SerpAPI: https://serpapi.com/search-api and https://serpapi.com/extract-api
- WonderSearch: https://docs.evokoa.com/wondersearch/reference/

The synthetic fixtures under testdata are derived from searchSDK's TypeScript
reference and shared interoperability contract, not authenticated provider data.
This package includes no third-party runtime code, website fonts or artwork.
