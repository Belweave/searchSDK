# Priority provider client generator

Run from any directory with Python 3; no dependency installation or network access is required:

```sh
python3 scripts/providers-a/generate.py
python3 scripts/providers-a/generate.py --check
```

The generator writes only the five assigned `packages/sdk/src/native-{exa,tavily,brave,context,tinyfish}.ts` modules and `scripts/providers-a/operations.json`. `--check` verifies the snapshot digests and compares expected output without changing files. The operation catalog includes named methods, native input/body/query/path type names, parameter names, HTTP methods, fixed hosts, response modes, and official sources. The public API inventory and access limitations are in `docs/provider-surfaces-a.md`.

`fixtures/` contains public provider schemas captured on 2026-10-22. `provenance.json` records official source URLs, retrieval date, source SHA-256, retained artifact SHA-256, and transformations. Example values and code samples are removed from retained schemas; field definitions, constraints, descriptions, and authentication declarations are retained. Source hashes identify the original retrieved document, while artifact hashes verify the sanitized inputs used offline.

Brave's reference pages expose structured public `apiSpec` data. Only that schema is retained; UI state, account state, and anti-CSRF values from other page-data nodes are never retained. The structured schema preserves optional/nullable distinctions that the Markdown tables lose. `brave.py` converts these retained reference schemas to the same internal OpenAPI representation as the other providers.

`extensions.py` contains small, hand-reviewed additions from official supplemental guides: Context Logo Link URL construction and HEAD inspection, Tavily explicit keyless mode and externally authorized x402 endpoint bindings, and TinyFish Research event names. It also preserves the separation between HTTP streaming negotiation and TinyFish's synthesis-delta setting. Supplemental source URLs and original hashes are in the provenance manifest. No payment signing or challenge negotiation is implemented.

## Updating a snapshot

1. Retrieve the official source URL recorded in the manifest; review its date and documentation changes.
2. For Exa YAML or Tavily's embedded YAML, parse with a YAML parser into JSON. The initial capture used Ruby's standard-library `YAML`; regeneration from retained JSON needs only Python.
3. Remove example/examples and code-sample values. For Brave, retain only the public `apiSpec` schema object from the reference page's structured data, never other UI-state nodes.
4. Replace the corresponding fixture and update its source/artifact digests, transformation note, and retrieval date in `provenance.json`. Review any access-gate or wire-protocol changes in `extensions.py` and the research document.
5. Regenerate, inspect the diff, compile the SDK, and run `packages/sdk/test/provider-native-a.test.mjs` plus the relevant shared transport checks. The fixture tests use independent expected wire examples, not this generated catalog as their oracle.

## Type-system boundaries

The emitter preserves referenced schemas, object properties, required fields, enums, arrays, nullable values, additional-property maps, and union/intersection compositions. Sibling object properties are retained alongside `allOf`/`anyOf`/`oneOf`; required-only alternatives use their parent property types. Distinct source schemas that share a name get separate aliases.

TypeScript does not enforce every JSON Schema rule. Numeric ranges, array/string lengths, formats, regex patterns, conditional `if`/`then`, `not`, and mutual-exclusion constraints are retained in the snapshots and explanatory comments where possible, but are not runtime validation. Deliberately unconstrained provider schemas remain `unknown` or explicit maps; the generator does not invent fields for them. Native JSON results are transport assertions, not provider-schema validation. Fixtures establish SDK behavior, not live provider availability or universal correctness.
