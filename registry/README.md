# searchSDK registry

Each search provider is described once, as data. Every runtime, the
benchmark, the docs site and a future router read these files. No runtime
gets provider code.

**Nothing here is live-verified yet.** Specs come from public documentation
read on the dates they record. Response fixtures are synthetic.

| Path | What |
| --- | --- |
| `providers/<id>.json` | One spec per provider: endpoints, option mapping, result fields, cost, pricing, rate limits, terms |
| `schema/provider.schema.json` | The spec format (version 1) |
| `steps.json`, `steps.md` | The fixed named-step library and its exact semantics |
| `policy.json`, `policy.md` | Shared limits, validation, request building, billing, retry and fallback rules |
| `conformance/` | Vectors every runtime must pass |

## Adding a provider

Add `providers/<id>.json` and `conformance/providers/<id>.json`. No test or
runtime edit is needed. If the provider needs logic no step or format
feature offers, propose a general addition for every runtime.

- Leave out options the provider cannot honour, so runtimes report
  `unsupported` instead of sending a request that ignores them.
- Record every source URL with its retrieval date; list anything unclear
  under `unverified` with a JSON pointer and the reason.
- Write `null` for a price that is not public, and list provider options that
  change the bill in `pricing.costOptions`.
- Keys go in headers. A spec may put one in the URL only with
  `keyInUrlReason`.

## Rules the schema cannot check

Runtimes refuse a spec that breaks these: every `costOptions` key is a
declared provider option; every `locked` path exists in `fixed`; a `compose`
entry has an input part and its inputs are not also params; GET uses query encoding; `includedItems` needs
`extraBlock`; `ok` page sources are always billable.

Specs use a JSON Schema subset: `type`, `enum`, `const`, `properties`,
`required`, `additionalProperties`, `propertyNames`, `items`, `minItems`,
`maxItems`, `minimum`, `maximum`, `minLength`, `maxLength`, `pattern`,
`anyOf`, `oneOf`, `allOf` and local `$ref`. Provider options use the same.

## Versions

`formatVersion` changes only when the format breaks. `specVersion` is the date
a spec's facts were last checked. A provider counts as verified only after its
vectors pass against the live API; none has yet.
