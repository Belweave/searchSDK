# WonderSearch corpus retrieval

## Identity and evidence

[WonderSearch.ai](https://wondersearch.ai/) describes Evokoa’s serverless sparse
semantic retrieval product for customer documents and workspaces. It offers
REST, Python SDK, CLI, and MCP access. These are provider descriptions, not
independent quality or cost findings.

**Tested:** `curl -IL https://wondersearch.com` on 2026-10-22 returned HTTP 302 to
`https://wondersearch.ai/`, followed by HTTP 200. Treat
[wondersearch.com](https://wondersearch.com) as an entry domain for the same
product, not a second provider. The public [documentation](https://docs.evokoa.com/wondersearch)
and reference pages below were read successfully over direct HTTPS; the web
reader could not load that documentation host.

**Not tested:** authenticated API calls, ingestion, billing, relevance, latency,
SDK compatibility, access isolation, or benchmarks. No account or corpus was
created and no provider credentials were used. Marketing benchmarks should not
be presented as independent comparisons.

## Public API contract

- **Authentication:** base URL `https://api.wondersearch.ai`, routes under `/v1`;
  bearer workspace keys support Search Only or Read / Write permissions. Keep
  keys on a server. Account/billing administration uses a user access token.
  Standard REST lists use `data`/`next_cursor`, default 50, maximum 100. These
  list cursors are not search pagination.
  [Authentication reference](https://docs.evokoa.com/wondersearch/reference/authentication)
- **Search:** `POST /v1/drives/{drive_id}/search` or
  `POST /v1/workspaces/{workspace_id}/search` for the workspace’s default drive.
  Requires `Idempotency-Key` and a nonblank `query`; accepts `effort`,
  `folder_id`, `allow_degraded`, `group_by_document`, and `timeout_ms`.
  Medium effort and document grouping are defaults. Folder selection is direct
  contents only, excluding subfolders. Deprecated `model` and `limit` fields
  are accepted but ignored; omit them.
  [Search API](https://docs.evokoa.com/wondersearch/reference/search-api)
- **Response:** ranked passage results carry document/external IDs, a string
  document revision, passage ID, text, metadata, score, and UTF-8 source offsets.
  The envelope includes request/drive IDs, warnings, and decimal-string USD
  usage cost; preserve requested versus served effort when supplied. Retain
  provider fields rather than flattening these into web URL results.
  [Search response reference](https://docs.evokoa.com/wondersearch/reference/search-api)
- **Limits:** every effort returns at most ten results; the documented search
  contract exposes no pagination cursor. Request timeout is 1–20,000 ms.
  Capabilities report enabled efforts/timeouts. Queries are limited to 512
  tokens and 16,384 UTF-8 bytes; documented language support is English. The
  provider describes Small/Medium/Large effort, not interchangeable “deep”
  search modes.
  [Effort guide](https://docs.evokoa.com/wondersearch/search/effort-and-limits),
  [limits](https://docs.evokoa.com/wondersearch/reference/limits)
- **Citations:** score is not a confidence percentage. Save exact returned text,
  source IDs, drive, and revision. Offsets refer to extracted text, not PDF pages
  or original bytes. Passage fetch requires a matching `index_snapshot_id`,
  which search responses **do not include**; the latest snapshot is not a safe
  substitute. Later deletion, revision changes, or revoked access may prevent
  retrieval.
  [Results and citations](https://docs.evokoa.com/wondersearch/search/results-and-citations)
- **Ingestion:** upload/indexing is a prerequisite to searching a collection.
  Supported files include PDF, DOCX, TXT, and Markdown; scanned PDFs require
  OCR before upload. Wait for searchable status and distinguish accepted from
  searchable revision after updates. Published file/drive limits and storage
  allowances must be checked before importing.
  [File limits](https://docs.evokoa.com/wondersearch/reference/limits),
  [freshness](https://docs.evokoa.com/wondersearch/search/freshness)

## SDK integration

The `/wondersearch` subpath exposes typed corpus search and the
`/native-wondersearch` subpath exposes the documented native API. Preserve
workspace/drive IDs, revisions, passage citations, notices and provider-reported
usage. Corpus results can lack public URLs, so WonderSearch is excluded from
normalized web search and the public-web benchmark comparison.

See [the provider catalog](provider-catalog.md) and
[native contract inventory](provider-surfaces-b.md) for the implemented surface.
Retries and degraded responses do not imply free requests or unchanged effort.
The integration is tested with synthetic fixtures; authenticated provider
behavior and independent performance remain unverified.
