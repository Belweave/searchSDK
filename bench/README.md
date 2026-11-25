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

Keys stay in a git-ignored, mode-600 file of `KEY=value` lines, with one
documented variable per provider. Node loads the file with `--env-file`, and
nothing prints its values:

```sh
K=../.local/bench/keys.env    # .local/bench/keys.env at the repository root
node --env-file=$K src/cli.ts keys --config config/first.json --file $K    # present or missing, names only
BENCH_ALLOW_LIVE=1 node --env-file=$K src/cli.ts smoke --config config/first.json --live --confirm-spend 0.1
BENCH_ALLOW_LIVE=1 node --env-file=$K src/cli.ts run --config config/first.json --live --confirm-spend 7
node --env-file=$K src/cli.ts label --run <runId>      # human check, blind
node --env-file=$K src/cli.ts publish --run <runId>    # results, leaderboard, routing table
```

`bench smoke` sends 2 or 3 searches and 1 contents call per provider, for a
few cents. It reports, for each spec field path, how often the path was
present in the raw responses, and it names the paths that look wrong. Run it
before any full run. `--no-judge` runs known-answer scoring only, as an
explicit choice, and every output then says "not judged".

A live run refuses to start under CI, in tests, without every key, or unless
`--confirm-spend` repeats the cap. Each search reserves the SDK's cost bound
before it is sent (`costBound`: the highest documented rate, no guessed
margin), or $0.05 when the SDK cannot bound it. A call that could pass the
run cap, or $100 for the month, is not sent. Pages are read by the harness's
own fetcher (plain GET, robots.txt obeyed) at no cost. Judge calls are
`covered-by-plan` in the owner's configs (any reported charge halts the run)
or reserved at `list-price`. A provider with a hard account limit can be held
to it in credits or calls (`providerLimits`); that provider alone stops.
Interrupted runs continue with `--resume <runId>`.

See [PILOT.md](PILOT.md) for the first run: Exa, Context.dev, Firecrawl and
TinyFish, three passes, at most $5.76 under a $7 cap, with the full command
sequence.

## Where things live

| Path | Contents |
| --- | --- |
| `datasets/` | Public and fresh items (Wikidata, CC0), reviews, manifest, private-set hashes |
| `config/` | Method, runs, judges, tuning |
| `rubric/` | The judge's relevance rubric |
| `schemas/` | Items and the three published outputs |
| `.local/bench/` at the repository root | Raw responses, page text, judgments, labels, ledger, private items. Git-ignored and never published |

[METHOD.md](METHOD.md) defines every score, interval and rule.
