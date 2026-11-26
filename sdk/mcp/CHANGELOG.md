# Changelog

## 0.1.0 (unreleased)

First release candidate. Not published to npm.

- stdio MCP server on revision 2026-07-28, serving 2025-era clients too, built
  on `@modelcontextprotocol/server` 2.4.0.
- Docs and registry tools shared with https://searchsdk.dev/mcp: `search_docs`,
  `get_doc`, `list_providers`, `get_provider`, `estimate_cost`,
  `validate_options`, `get_example`; resources for every docs page, provider
  spec, the policy and the agent skill; two prompts.
- `search` and `contents` through `@searchsdk/sdk` with keys from the
  environment, never logged or returned.
