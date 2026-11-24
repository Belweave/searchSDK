# searchSDK Benchmarks

The harness behind the searchSDK leaderboard. It calls providers only through
`sdk/typescript`, so it measures what users get. Anyone can rerun it with
their own keys.

```sh
npm ci
npm run check                                     # typecheck, tests, datasets, pilot plan
node src/cli.ts plan --config config/pilot.json   # calls and maximum spend; sends nothing
node src/cli.ts pilot --config config/pilot.json  # whole pipeline on synthetic fixtures
```

Without `--live`, every run uses synthetic providers and a synthetic judge.
Its outputs say `"mode": "fixture"` and are never live measurements.

## Live runs

```sh
export BENCH_ALLOW_LIVE=1 EXA_API_KEY=… MORPH_API_KEY=…   # one documented variable per provider
node src/cli.ts run --config config/monthly.json --live --confirm-spend 90
node src/cli.ts label --run <runId>      # human check, blind
node src/cli.ts publish --run <runId>    # results, leaderboard, routing table
```

A live run refuses to start under CI, in tests, without every key, or unless
`--confirm-spend` repeats the cap. Each search reserves the SDK's cost bound
before it is sent (`costBound`: the highest documented rate, no guessed
margin), or $0.05 when the SDK cannot bound it. A call that could pass the
run cap, or $100 for the month, is not sent. Pages are read by the harness's
own fetcher (plain GET, robots.txt obeyed) at no cost. Judge calls are
`covered-by-plan` in the owner's configs (any reported charge halts the run)
or reserved at `list-price`. Interrupted runs continue with `--resume <runId>`.

See [PILOT.md](PILOT.md) for the first run: at most $7.30 under a $45 cap,
one command, waiting on all seven provider keys.

## Where things live

| Path | Contents |
| --- | --- |
| `datasets/` | Public and fresh items (Wikidata, CC0), reviews, manifest, private-set hashes |
| `config/` | Method, runs, judges, tuning |
| `rubric/` | The judge's relevance rubric |
| `schemas/` | Items and the three published outputs |
| `.local/bench/` at the repository root | Raw responses, page text, judgments, labels, ledger, private items. Git-ignored and never published |

[METHOD.md](METHOD.md) defines every score, interval and rule.
