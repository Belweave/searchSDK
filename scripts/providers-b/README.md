# Provider B contract snapshots and generators

Reviewed 2026-10-22 using public official documentation. These files contain no
provider keys or authenticated responses. `provenance.json` records source URLs,
retrieval date, SHA-256 hashes, and whether a snapshot is upstream JSON, converted
OpenAPI YAML, or extracted public documentation.

Run from any directory with Python 3; no third-party modules, package installation,
or network access are needed:

```sh
python3 -B scripts/providers-b/verify.py
python3 -B scripts/providers-b/generate.py
python3 -B scripts/providers-b/wonder.py
python3 -B scripts/providers-b/serper.py
python3 -B scripts/providers-b/write_catalog_docs.py
```

The first emitter writes Perplexity, Parallel, Linkup, Firecrawl and You native
modules. The next two derive the WonderSearch and Serper contracts from the
retained documentation and emit their modules. The emitters also write
`catalogs/*-operations.json`, which is useful for API-reference generation.
`native-serpapi.ts` and the normalized adapters are maintained by hand; the
SerpAPI catalog records its endpoint families, not individual search engines.

After regeneration, build the SDK and run the independent fixtures:

```sh
nvm use
npm run build:sdk
node --test packages/sdk/test/provider-native-b.test.mjs packages/sdk/test/expanded-search.test.mjs
```

`generate.py` handles local schema references, intersections/unions, enums,
objects, arrays, nullable fields, required parameters, raw multipart/byte bodies,
and the documented SSE operations. It deliberately does not manufacture runtime
JSON Schema validation. Native requests retain provider names and response data;
normalized search has separate runtime validators. Open objects preserve unknown
fields. Stream narrowing uses an intersection so string index signatures cannot
erase required fields. Null optional headers are omitted before calling the
shared transport.

`wonder.py` transcribes prose-only bulk import and auto-topup operations in
addition to parsing the endpoint tables. These are **derived schemas**, not a
provider-issued OpenAPI document. Source downloads and JSON rewrites use only
standard-library tools. `serper.py` uses the official playground's public
request serializer and public homepage result examples; internal allowlisted
products and undocumented account routes are excluded.

When updating a provider, review current official documentation, refresh its
snapshot and provenance hash, then regenerate and inspect the diff. Snapshot
identity is evidence of what was reviewed; it does not prove live conformance.
