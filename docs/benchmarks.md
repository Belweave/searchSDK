# Benchmark protocol and Boat runbook

Live results are not yet available. Boat is the planned execution venue; no Boat run is claimed. Local fixtures validate the harness and adapter contracts only. The website deliberately has no leaderboard until reviewed evidence exists.

The versioned [protocol draft](../apps/web/public/benchmark-methodology.json) is `0.2.0-draft`. It covers 14 normalized web-search adapters and records WonderSearch separately as corpus retrieval. WonderSearch requires a frozen, lawfully reusable corpus, access policy, ingestion state, and corpus-specific judgments. The harness does not ingest documents or perform native mutations. Extraction, generated answers, and research jobs require separate protocols.

## Run safely from a source checkout

Use the patched Node version in `.nvmrc`. These commands use repository source and workspace dependencies; they do not assume an npm publication.

```sh
npm ci
npm run build:sdk
node benchmarks/run.mjs --mode plan
node --test --test-concurrency=1 benchmarks/test/*.test.mjs
node benchmarks/run.mjs --mode fixture
```

Coordinate the SDK build with other work in a shared checkout. An existing isolated compiled SDK can be selected without rebuilding shared output:

```sh
node benchmarks/run.mjs --mode fixture --sdk-root ./compiled-sdk
SEARCHSDK_BENCHMARK_TEST_SDK_ROOT=./compiled-sdk node --test --test-concurrency=1 benchmarks/test/*.test.mjs
```

The selected directory must contain trusted compiled SDK modules including `index.js`. Its contents are executed as local code. The path is never written to results. Build/source hashes identify the artifact; a source hash and a different compiled hash do not establish that a build came from those sources. For publication, rebuild the selected commit in the pinned runtime and verify both.

With no arguments, the CLI only creates a plan. Fixture mode injects synthetic JSON at every adapter's transport, does not read provider keys, and cannot produce live-provider evidence. Live mode requires **both** `--allow-live` and `SEARCHSDK_BENCHMARK_ALLOW_LIVE=1`, plus validated configuration. A flag alone never enables it. No Boat provisioning, login, upload, key request, or paid call is part of the harness.

Output goes to a fresh ignored `.local/benchmarks/<runId>/` directory unless `--output` selects another fresh directory. Existing directories are refused to avoid mixing evidence. The CLI prints a small status object, not secret values or raw errors. Exit `0` means planning or execution completed; it does not mean every response succeeded. Exit `2` marks a budget/deadline/cancellation partial run; exit `1` marks setup failure. Inspect per-attempt outcomes even after exit `0`.

## Dataset and comparison conditions

[`public-web-v1`](../benchmarks/datasets/public-web-v1.json) contains 12 original prompts about public documentation, science, reference, and explanations, dedicated under CC0-1.0. It contains no personal data, customer queries, account identifiers, private domains, or copied document text. This is a smoke dataset, too small and narrow to support general search rankings. A later representative dataset needs its own version, provenance, rights review, topic/language distribution, and documented exclusions.

Default conditions are a result ceiling of 10, one warmup per provider, three measured rounds per query, one active request, a 15-second per-query timeout, one second between live request starts, a 600-request ceiling, and a 30-minute whole-run deadline. Fourteen adapters produce 518 scheduled requests: 14 warmups and 504 measured attempts. The checked-in spending limit is **zero**, with unverified provider plans and prices, so this configuration cannot run live.

Provider and query order use a seeded shuffle, interleaved per query and repeated each round. Every provider gets the same prompts, output ceiling, timeout, and dispatch policy. Retries, fallback, SDK cache, and in-flight deduplication are off. Warmups, errors, and timeouts consume the same request and cost-reservation budgets. A timeout or cancellation does not prove the remote provider avoided charging for an accepted request. An interrupted run is never automatically retried or resumed.

Each provider's API revision and exact adapter profile are in [`providers.mjs`](../benchmarks/providers.mjs). Profiles use normalized adapter defaults, without custom filters or extra native operations. Context's request floor, TinyFish's fixed first page, SerpAPI's first organic page, snippet/content work, upstream index differences, and provider defaults mean the native work is not identical. Preserve those limitations beside results. Never compare provider-native relevance values directly.

SearXNG is an operator-selected instance, not a universal hosted service. Its JSON support, enabled upstream engines, locale, safe-search defaults, index access, and operator limits affect results. A future run needs a public `instanceAlias` and SHA-256 of an approved sanitized engine/configuration manifest. Store no private host, IP, token, or account identifier in that manifest. `SEARXNG_BASE_URL` is runtime-only and is not serialized; this protocol requires an HTTPS origin without credentials, paths, query strings, or fragments. Private-host attribution stays private; public readers need enough sanitized engine/configuration detail to assess reproducibility, and the alias alone is insufficient. Do not discover public instances or share someone else's rate budget automatically.

## Future live configuration

Copy `benchmarks/configs/portable-v1.json` into an ignored local directory. Before a separately authorized live session, set the verified execution environment, region, and machine class; named provider plans; pricing verification date; funding and provider-credit disclosures; each provider's conservative `reservationUsdPerRequest`; and a positive `maxSpendUsd` approved for that run. Reduce the provider list or sample counts to fit the authorized limits. Unknown reservations are rejected. The entire planned reservation must fit the cap before dispatch. Reservation arithmetic bounds dispatch using operator-supplied estimates; it cannot guarantee third-party charges. Reconcile actual usage afterward.

Provider key environment names are `CONTEXT_API_KEY`, `TINYFISH_API_KEY`, `EXA_API_KEY`, `TAVILY_API_KEY`, `BRAVE_API_KEY`, `PERPLEXITY_API_KEY`, `PARALLEL_API_KEY`, `LINKUP_API_KEY`, `FIRECRAWL_API_KEY`, `YOU_API_KEY`, `SERPER_API_KEY`, `SERPAPI_API_KEY`, and `VALYU_API_KEY`. SearXNG uses `SEARXNG_BASE_URL`, with no universal key. This initial harness does not forward optional reverse-proxy authentication headers; do not place them in configuration or URLs. Configure secrets privately in the execution environment, never in command arguments, tracked files, or result artifacts.

The future live command has an intentionally explicit form:

```sh
SEARCHSDK_BENCHMARK_ALLOW_LIVE=1 node benchmarks/run.mjs --mode live --allow-live --config .local/benchmarks/live-config.json
```

This command is not a request to run now. Validate its plan and limits first. The CLI resolves all selected adapters before the first dispatch, records incomplete runs, and requires the same opt-in checks when called through its library API.

## Boat runbook for a later authorized session

Reviewed official sources: [Boat](https://boat.dev), [documentation index](https://docs.boat.dev/llms.txt), [CLI reference](https://docs.boat.dev/cli-reference), [SSH and file transfer](https://docs.boat.dev/ssh-access), [auto-stop](https://docs.boat.dev/long-running-tasks/auto-stop), and [stopping](https://docs.boat.dev/snapshots/stop). Recheck the current docs and CLI flags before execution; availability, regions, pricing, and retention can change.

1. Establish a separately authorized compute budget and provider budget. Use the operator's own Boat session; authentication and account setup are outside this harness. Verify the intended billing scope, current limits, verified region, and current CLI version privately. Do not copy account IDs or command history into public artifacts.
2. Prepare a sanitized source archive from the exact reviewed commit, excluding `.git`, `.local`, `.env*`, credentials, local reports, and unrelated files. Keep the commit and archive hash. Use one sandbox and one serial harness process. Avoid account-wide inherited repositories/secrets unless intentionally needed.
3. Once authorized, create one bounded sandbox with the documented CLI pattern `boat new --type small --ttl 3600 --no-env --no-snapshots --no-monitoring --json`. Record the chosen size and actual verified region as sanitized labels, not machine/account IDs. No region-selection CLI flag is assumed. If region cannot be verified, stop the process before live dispatch. Check the actual auto-stop deadline: it counts from creation/resume, and ordinary SSH or exec work does not keep it alive.
4. Transfer only the sanitized archive using documented `boat scp` or a reviewed source checkout. Install the Node version from `.nvmrc`, then `npm ci` and one bounded SDK build. Record OS, architecture, CPU count, memory class, Node version, lockfile hash, SDK source/build hashes, protocol/dataset/config hashes, and verified region. The harness captures the nonidentifying runtime fields automatically; the operator verifies region and machine class.
5. Run plan, focused tests, and fixtures inside the sandbox. Export these as fixture-only evidence if useful; do not relabel them. Keep preparation outside the measured provider window. Verify the remaining TTL exceeds the run deadline and export time; the default run deadline is 30 minutes, so do not start a long run near auto-stop.
6. Privately supply only the selected provider credentials for the run. Review secret persistence and telemetry against current Boat settings; secrets must not be placed in `boat exec` command strings or shared archives. Execute the live command only after its explicit run authorization. Keep an external wall-clock deadline and compute budget as well as the harness's request/reservation limits.
7. Export `run.json`, `attempts.jsonl`, and `results.json` before teardown. Confirm file counts and hashes. A lost connection, timeout, or interrupted output is a partial run, not permission for an automatic rerun. Reconcile any ambiguous provider billing privately. Do not upload raw Boat JSON, command logs, full URLs, or environment dumps as benchmark evidence.
8. Stop the sandbox in cleanup with documented `boat stop <sandbox>` and verify the terminal state with a bounded wait. Stop requests are asynchronous; the CLI uses `stopped` while the API uses `archived`. With snapshots disabled, the disk is not a backup. If cleanup fails, surface that failure and resolve the remaining compute allocation explicitly. No always-on VM or recurring task is needed for this protocol.

The harness is independent of Boat SDKs and runs on a standard supported Node runtime. Boat creation and teardown are deliberate operator steps, not hidden side effects of a benchmark command.

## Artifacts, metrics, and publication

`run.json` is the manifest: versioned schedule, hashes, safe runtime metadata, settings, disclosures, and status. It starts as `incomplete` before dispatch and is finalized only after results are written. `attempts.jsonl` appends one allowlisted record after each completed attempt. [`attempt.schema.json`](../benchmarks/attempt.schema.json) defines those records. [`results.schema.json`](../benchmarks/results.schema.json) defines `results.json`: the same records, per-provider summaries, exclusions, stop reason, unstarted count, and explicit null relevance and unreconciled-cost values. All outputs have `publicationReady: false`; no command uploads results or updates the website.

Artifacts omit keys, headers, full request/result URLs, query text, result content, provider request IDs, raw errors, environment values, account identifiers, and private hostnames. Query IDs link back to the fixed public dataset. Only allowlisted error codes, numeric status, counts, durations, and finite provider-reported usage units are retained. Local filesystem paths and host/user names are not runtime metadata. SIGINT/SIGTERM cancel active work and prevent subsequent dispatch; a hard process kill can leave an incomplete manifest. Completed JSONL records survive ordinary interruption; no claim of crash-proof or exactly-once recording is made.

Latency uses monotonic time around each SDK call and nearest-rank p50/p95 over schema-valid measured responses. It includes client/transport/parsing time and excludes deliberate dispatch spacing and warmups. Failed/timeout durations remain in raw records and separate counts; they cannot be silently dropped from the reliability denominator. Completion is valid responses, including separately counted empty results, divided by all started measured attempts. Unstarted requests are disclosed separately. A low latency percentile with many errors is not evidence of a faster reliable service. Warmup describes a reused process, not a controlled provider cache or network condition.

Cost remains null until plan/date and billing reconciliation support USD per 1,000 measured attempts, with warmup charges separate. Provider-reported credits, provider-reported USD, conservative reservations, and actual billed USD are different evidence. Never infer that missing usage means zero cost.

Relevance remains null. A later quality study needs lawful reusable result evidence, a representative frozen dataset, two independent provider-blinded judges, a 0–3 relevance rubric, agreement and adjudication, nDCG@10 per query, and query-cluster bootstrap 95% confidence intervals with seed/resample count. The current privacy-minimal harness deliberately retains no raw content or URLs, so it cannot produce those judgments by itself. Record and review any evidence-capture extension before claiming relevance scores.

Before publishing any live artifact, inspect it for secrets and private metadata, confirm rights to evidence, disclose funding/credits and exclusions, distinguish partial from complete runs, verify pinned-build reproduction, and publish limitations beside the data. Fixture success and endpoint coverage are not proof of live availability, all account-gated behavior, or comparative quality.
