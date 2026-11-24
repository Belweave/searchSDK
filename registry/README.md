# searchSDK registry

Each search provider is described once, as data. Every runtime, the
benchmark, the docs site and a future router read these files. Adding a
provider means adding one file; no runtime gets provider code.

**Nothing here is live-verified yet.** Specs come from public documentation
read on the dates they record. Response fixtures are synthetic.

| Path | What |
| --- | --- |
| `providers/<id>.json` | One spec per provider: endpoints, option mapping, result fields, cost, pricing, rate limits, terms |
| `schema/provider.schema.json` | The spec format (version 1) |
| `steps.json`, `steps.md` | The fixed named-step library and its exact semantics |
| `policy.json`, `policy.md` | Shared limits, defaults, status mapping, retry and fallback rules |
| `conformance/` | Vectors every runtime must pass |

## Writing a spec

- Map normalized options to provider fields with paths. Transform values only
  through named steps. If a mapping needs logic no step offers, propose a new
  step for every runtime; never add provider code.
- Leave out options the provider cannot honour. Runtimes then report
  `unsupported` instead of sending a request that silently ignores them.
- Record every source URL with its retrieval date.
- List anything the docs leave unclear under `unverified`, with a JSON pointer
  and the reason.
- Keys go in headers. A spec may put one in a URL only with
  `keyInUrlReason`.
- Add vectors in `conformance/providers/<id>.json`.

Specs use a JSON Schema subset so any runtime can validate them: `type`,
`enum`, `const`, `properties`, `required`, `additionalProperties`,
`propertyNames`, `items`, `minItems`, `maxItems`, `minimum`, `maximum`,
`minLength`, `maxLength`, `pattern`, `anyOf`, `oneOf`, `allOf` and local
`$ref`. Provider options use the same subset.

## Versions

`formatVersion` changes only when the format breaks. `specVersion` is the date
a spec's facts were last checked. A provider counts as verified only after its
vectors pass against the live API; none has yet.
