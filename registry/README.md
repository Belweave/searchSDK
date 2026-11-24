# searchSDK registry

Each search provider is described once, as data, for every runtime, the
benchmark, the docs and the router. No runtime gets provider code.

**Nothing here is live-verified yet.** Specs come from public documentation
read on the dates they record. Response fixtures are synthetic.

- `providers/<id>.json`: one spec per provider.
- `schema/provider.schema.json`: the spec format (version 1).
- `steps.json`, `steps.md`: the named-step library and its exact semantics.
- `policy.json`, `policy.md`: shared validation, request, billing, retry and
  fallback rules.
- `conformance/`: vectors every runtime must pass.

## Adding a provider

Add `providers/<id>.json` and `conformance/providers/<id>.json`; no test or
runtime changes. Logic no step or format feature offers needs a general
addition for every runtime.

- Leave out options the provider cannot honour; runtimes then report
  `unsupported`.
- Record each source URL with its retrieval date; list anything unclear under
  `unverified` with a JSON pointer and the reason.
- Write `null` for a price that is not public; list provider options that
  change the bill in `pricing.costOptions`. Record higher documented rates
  (overage, another plan, the top of a range) in `pricing.ceiling`, and free
  use with what happens past it in `pricing.allowance`.
- Give every rate limit and allowance a `unit` (`requests`, `urls`, `results`
  or `query-units`). When documents disagree, record each limit with its
  `source`; consumers obey the strictest.
- Say what search excerpts are in `response.excerptKind`: `description`,
  `content-chunk`, `highlights`, or `none` when no excerpts are mapped.
- Start each endpoint at `"verification": { "status": "unverified" }`.
- Keys go in headers. A key may go in the URL only with `keyInUrlReason`.

## Rules the schema cannot check

Runtimes refuse a spec unless: each `costOptions` key is a declared provider
option; each `locked` path exists in `fixed`; each `compose` entry has an
input part and its inputs are not also params; GET uses query encoding;
`includedItems` comes with `extraBlock`; `ok` page sources stay billable;
every string is well-formed Unicode; every pattern is in the portable subset.
With query encoding, `fixed` values are strings, numbers or booleans, and no
`fixed` key or provider option is integer-like (`0`, `10`): ECMAScript lists
such keys first, so the parameter order would differ by runtime.

Specs and provider options use only these JSON Schema keywords: `type`,
`enum`, `const`, `properties`, `required`, `additionalProperties`,
`propertyNames`, `items`, `minItems`, `maxItems`, `minimum`, `maximum`,
`minLength`, `maxLength`, `pattern`, `anyOf`, `oneOf`, `allOf`, local `$ref`.

Patterns use a portable subset of ECMAScript (`u` flag) that every runtime
can translate exactly: literals; `.`; `^` and `$`; classes `[...]` and
`[^...]` with ranges; `\d \D \w \W \s \S` (negated ones outside classes);
`\t \n \r \f \v`, `\xHH`, `\uHHHH` and `\u{H...}` (no surrogates); escaped
syntax characters; `(...)`, `(?:...)` and `|`; quantifiers `* + ? {n}
{n,} {n,m}`, optionally lazy. No lookaround, named groups, backreferences,
`\b` or `\p{...}`. Semantics: policy.md.

## Versions

`formatVersion` changes only when the format breaks. `specVersion` is when a
spec's facts were last checked. An endpoint is verified only once its vectors
pass against the live API; its `verification` then records the date and the
runtimes that passed. Every endpoint is `unverified` today. The site and
benchmark read this field; nobody keeps a separate list.
