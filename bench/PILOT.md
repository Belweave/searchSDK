# First live run

The first live run compares four providers: Exa, Context.dev, Firecrawl and
TinyFish (`config/first.json`). Nothing here has run live yet. Every figure
below comes from dry runs and offline fixture tests. The registry specs stay
`unverified` until a live check passes.

## Commands

Run these from `bench/` in the main checkout, after the branch is merged. Keys
live in `.local/bench/keys.env` at the repository root, which is git-ignored.
From `bench/` that file is `../.local/bench/keys.env`. It holds `KEY=value`
lines using the registry's variable names: `EXA_API_KEY`,
`CONTEXT_DEV_API_KEY`, `FIRECRAWL_API_KEY`, `TINYFISH_API_KEY`, and
optionally `MORPH_API_KEY`. Node loads the file itself with `--env-file`;
no dotenv package is involved. Keep `BENCH_ALLOW_LIVE` out of the file. Set
it on the command line of each live command, so every spend is a deliberate
opt-in.

```sh
cd bench && npm ci && npm run check
chmod 600 ../.local/bench/keys.env

# 1. Keys: lists each needed variable as present or missing, plus the file's mode. Never prints a value.
node --env-file=../.local/bench/keys.env src/cli.ts keys --config config/first.json --file ../.local/bench/keys.env

# 2. Smoke check: 2 searches and 1 contents call per provider. At most $0.049, cap $0.10. Fix every "error" line before step 4.
BENCH_ALLOW_LIVE=1 node --env-file=../.local/bench/keys.env src/cli.ts smoke --config config/first.json --live --confirm-spend 0.1

# 3. Tuning plan: the split, each provider's candidates and cost bounds, and the calls and credits of
#    tuning, the main run and its tuned condition, with Firecrawl credits used so far. Sends nothing.
node --env-file=../.local/bench/keys.env src/cli.ts tune --config config/first.json

# 4. Tune: default + 2 candidates per provider on the 16-item split, one pass, known-answer only.
#    At most $1.04, cap $1.25; Firecrawl 96 credits. Refused if it would leave too few credits for step 6.
#    Writes the selection to ../.local/bench/tuning/<tuningRunId>.json.
BENCH_ALLOW_LIVE=1 node --env-file=../.local/bench/keys.env src/cli.ts tune --config config/first.json --live --confirm-spend 1.25

# 5. Plan with the selection: calls, maximum spend and Firecrawl credits used so far. Sends nothing.
node --env-file=../.local/bench/keys.env src/cli.ts plan --config config/first.json --tuned ../.local/bench/tuning/<tuningRunId>.json

# 6. Live run: prints the plan again, checks every key and the split's disjointness, then runs search
#    (default and tuned), pages, both judges and scoring.
BENCH_ALLOW_LIVE=1 node --env-file=../.local/bench/keys.env src/cli.ts run --config config/first.json --tuned ../.local/bench/tuning/<tuningRunId>.json --live --confirm-spend 8

# 7. Resume after an interruption, with the same --tuned. Finished calls are not repeated; resumed calls count against the same cap and credit limit.
BENCH_ALLOW_LIVE=1 node --env-file=../.local/bench/keys.env src/cli.ts run --config config/first.json --tuned ../.local/bench/tuning/<tuningRunId>.json --live --confirm-spend 8 --resume <runId>

# 8. Human check: grade at least 100 judged pairs blind, which takes about an hour. Quit and rerun at any time.
node --env-file=../.local/bench/keys.env src/cli.ts label --run <runId>

# 9. Publish: writes results.json, attempts.jsonl, leaderboard.json and routing-table.json.
node --env-file=../.local/bench/keys.env src/cli.ts publish --run <runId>
```

Step 4 needs the tuning split, `datasets/public/tuning-0.1.0.jsonl`, built
with the public builders under its own spec and seed (not built yet). Step 3
plans without it and says so; step 4 refuses until it exists, and refuses
if it shares an item id, query, Wikidata statement or subject with the
scored sets. To skip the tuned column, replace `--tuned <file>` with
`--no-tuned` in steps 5 to 7 and skip steps 3 and 4. A run of
`config/first.json` with neither flag is refused.

Without `MORPH_API_KEY`, step 6 is refused, and the message names the way
out. To run without judging, add `--no-judge` to steps 1, 5, 6 and 7. The
run is then named `first-notjudged`, and the plan, the printed scores and
`results.json` (`"judging": "not judged (--no-judge)"`) all say it was not
judged. Known-answer scoring, which sets the rank, is unchanged. A resumed
run must use the same choice. Step 8 has nothing to label in an unjudged
run. Tuning never uses a judge.

Morph's Ultra period ends on 2026-12-09. Finish steps 6 and 7 before then:
both judges are covered only by the plan, and any charge a judge reports
halts the run.

## What it runs

- **Providers:** Exa, Context.dev, Firecrawl and TinyFish, with SDK defaults
  only (the headline profile).
- **Items:** 96: the seed set (86) and the November freshness set (10).
- **Passes:** each item goes to each provider three times, for 1,152
  searches. Every pass is scored, so an item's known-answer score is its
  mean over the passes. The harness reads pages for every pass.
- **Pages:** the top 3 result pages of every search are read by the
  harness's own fetcher (a plain GET that obeys robots.txt), never by a
  provider. The fetcher resolves every host first and connects only to
  public addresses.
- **Judging:** every item. Kimi K3.1 Pro is the primary judge and grades
  15% of pairs twice. DeepSeek V4.1 Flash is the check judge and grades
  every pair once. Both are blind and covered by the Morph Ultra plan.
- **Tuned column:** each provider's setting chosen by `tune` (METHOD §8) on
  a separate 16-item split, scored in the same run on 32 seeded items, pass
  1, the same items for every provider: 128 more searches at most. It is
  shown beside the headline with the default on the same items, never
  ranked and never judged.
- **Firecrawl:** held to 800 credits counted from 2026-11-25. The count
  includes smoke checks, tuning, this run and its resumes.

### Why three passes

Owner's brief: multiple samples, but cheap. Two passes give one test-retest
comparison. Three passes also make each item's score a mean of three draws,
which cuts the within-item noise that a single reply carries. No live data
yet shows that two passes are enough, because the pilot never ran. The third
pass costs at most $1.92 and 192 Firecrawl credits, and it fits both the
cap and the credit limit. Every provider gets the same three passes. The
Firecrawl limit leaves room for all of them, so no provider gets fewer
samples than another.

## Most it can spend: $7.75 in all

| Step | Maximum | Cap | Firecrawl credits |
| --- | --- | --- | --- |
| Smoke check | $0.049 | $0.10 | 5 |
| Tuning | $1.04 | $1.25 | 96 |
| Main run, default (headline) | $5.76 | | 576 |
| Main run, tuned condition (worst case) | $0.90 | | 64 |
| Main run total | $6.66 | $8 | 640 |
| **All steps** | **$7.75** | | **741 of 800, 59 to spare** |

The 59 spare Firecrawl credits cover about 29 resent searches, or a second
smoke check, on resume. `tune --live` refuses to start if the ledger shows
that tuning plus the main run would no longer fit Firecrawl's 800.

Dry run of `node src/cli.ts tune --config config/first.json` (method 0.4.0,
empty ledger):

```text
searchSDK Benchmarks tuning plan (dry run: nothing is sent)
split: 16 items drawn by seed from datasets/public/tuning-0.1.0.jsonl  [NOT BUILT YET: datasets/public/tuning-0.1.0.jsonl]
every provider: default + 2 candidates, 1 pass, known-answer only (judges off), cost bound at most $0.02 per call
selection: a candidate replaces the default only with a gain of at least 0.06 and a 95% paired interval above zero
tuned condition in the main run: 32 seeded items, pass 1, the same for every provider

candidates (SDK cost bound per call):
  exa        t1 {"depth":"fast"} $0.004; t2 {"depth":"deep"} $0.015
  context    t1 {"providerOptions":{"descriptionMaxCharacters":2000}} $0.003; t2 {"country":"US"} $0.003
  firecrawl  t1 {"providerOptions":{"highlights":false}} $0.01; t2 {"country":"US","providerOptions":{"location":"United States"}} $0.01
  tinyfish   t1 {"providerOptions":{"purpose":"Find a web page that states the factual answer to this question."}} $0; t2 {"country":"US"} $0

provider    tuning calls    max $  credits | main calls of which tuned  credits |   used  limit   left
exa               3 x 16    $0.42        - |        320      32 (- cr)        - |      -      -      -
context           3 x 16    $0.14       48 |        320     32 (32 cr)      320 |      -      -      -
firecrawl         3 x 16    $0.48       96 |        320     32 (64 cr)      640 |      0    800     64
tinyfish          3 x 16    $0.00        - |        320      32 (- cr)        - |      -      -      -

tuning: maximum possible spend $1.04; tuning cap $1.25
main run calls and credits include the tuned condition at its worst case (each provider's dearest candidate); a provider whose selection keeps its default sends no tuned calls.

main run first with its tuned condition at the worst case: maximum possible spend $6.66 under its cap $8.00
```

Dry run of `node src/cli.ts plan --config config/first.json` before a
selection (the tuned condition at its worst case):

```text
search                      calls  reserve per call (SDK cost bound)         max
exa (default)                 288  $0.0070 = bound                         $2.02
exa (tuned)                    32  $0.0150 = bound                         $0.48
context (default)             288  $0.0030 = bound                         $0.86
context (tuned)                32  $0.0030 = bound                         $0.10
firecrawl (default)           288  $0.0100 = bound                         $2.88
firecrawl (tuned)              32  $0.0100 = bound                         $0.32
tinyfish (default)            288  $0.0000 = free allowance, overage off    $0.00
tinyfish (tuned)               32  $0.0000 = free allowance, overage off    $0.00
  tuned: a seeded subset of 32 items, pass 1, the same items for every provider
  by condition: default 1152 calls, $5.76; tuned 128 calls, $0.90
search subtotal              1280                                          $6.66

provider credits (the provider's own units; limits count every run and smoke check in the ledger):
  context   1 per call x 320 calls = 320 credits
  firecrawl 2 per call x 320 calls = 640 credits; limit 800 since 2026-11-25, 0 used, 160 to spare

not charged (outside the spend total):
  pages: at most 3840 URLs through the harness's own fetcher (plain-1; no provider, 4 in flight, 1000 ms between calls to one host)
  judge morph-kimi-k3.1-pro: 1152 pairs + 173 repeats, covered by plan; any charge the judge reports halts the run
  check judge morph-deepseek-v4.1-flash: 1152 pairs, covered by plan; same halt rule

maximum possible spend $6.66; run cap $8.00; monthly cap $100.00
pacing: exa 400 ms/2 in flight; context 12000 ms/1 in flight; firecrawl 12000 ms/1 in flight; tinyfish 14400 ms/2 in flight
```

With a selection, a provider whose choice is its default shows `0` tuned
calls ("reuses its default calls"), and the totals drop by its share.

Smoke check dry run (`smoke --config config/first.json`): at most $0.049
under a $0.10 cap. That covers 2 Exa searches at $0.007 and 1 contents call
at $0.001; 2 Context searches at $0.003 and 1 scrape at $0.003; 2 Firecrawl
searches at $0.010 and 1 scrape at $0.005, which is 5 credits; and TinyFish
at $0.

- **Worst case.** Each reservation is the SDK's cost bound: the highest
  documented rate for 10 results. Context reserves at its $3-per-1,000
  overage rate and Firecrawl at Hobby extra credits ($0.005 each), so both
  sit above their plan prices. TinyFish's $0 bound holds only while wallet
  spending stays off on the account, because the price past the 12,000
  searches a day is not published. Smoke, tuning and this run use about 370
  TinyFish searches. The $8 cap is the $6.66 worst case with about 20% room
  for resumed calls; tuning has its own $1.25 cap.
- **Expected spend.** Exa reports about $0.007 per search, so about $2.02
  for the headline, plus at most $0.42 for tuning and $0.48 for a `deep`
  tuned condition. Context costs 288 credits for the headline, 48 for tuning
  and 32 for the tuned condition, about $0.74 at the Developer price, or
  nothing on remaining plan credits. Firecrawl draws at most 741 credits from
  the owner's existing balance, so no new cash; the ledger still counts them
  at list price. Expected new cash is roughly $2.50 to $3.50.
- **Firecrawl credits.** Firecrawl's docs: a search costs 2 credits per 10
  results, rounded up, and scrapes each result only when `scrapeOptions` is
  sent. The registry spec never sends it, and neither the headline nor the
  search spaces can add it. A scrape costs 1 credit. Smoke, tuning and the
  run use at most 741 of 800, which leaves 59 credits, about 29 resent
  searches, for resumes. The limit stops Firecrawl alone before it would
  pass 800; the others finish.
- **Why the tuned condition is a subset.** Running it on every item and
  pass, like the headline, would add 576 Firecrawl credits: far more than
  the limit leaves. Every provider instead gets the same 32 seeded items on
  pass 1, compared with its own default on those items and that pass
  (METHOD §8).
- **Free parts.** Page reads cost nothing: they use the harness's own
  fetcher. Judging adds no spend: Ultra covers both judges, the cap counts
  provider calls only, and any charge a judge reports halts the run.

## Run time

About 5 to 6 hours, unattended, plus about 12 minutes of tuning first. A VM
suits it.

- **Tuning, about 12 minutes.** 48 searches per provider; TinyFish at 14.4 s
  per call sets the pace.
- **Search, about 75 minutes.** The tuned condition adds 32 calls per
  provider, about 8 minutes for TinyFish. Each provider is held to half its strictest
  documented limit. With no `rateLimitPlans` set, that means free-plan
  limits. TinyFish (500 an hour) is the slowest at 14.4 s per call, which
  gives 288 calls in about 69 minutes. Context and Firecrawl (10 a minute
  on free plans) take about 58 minutes at 12 s per call. Providers run side
  by side, so the slowest sets the pace. With paid Context or Firecrawl
  plans, `"rateLimitPlans": {"context": "Developer"}` speeds them up but not
  TinyFish.
- **Pages, about 30 to 60 minutes.** At most 3,456 URLs; many repeat across
  passes and providers. Four requests are in flight, with one request per
  host per second.
- **Judging, about 3 to 4.5 hours.** Kimi K3.1 Pro is paced to half its
  Ultra token limits (24,290 input and 6,162 output tokens a minute), which
  works out to about 9 to 13 s per call. Each call's own time now counts
  toward that pause. There are at most 1,325 calls; read pages shared by
  providers make it fewer. DeepSeek V4.1 Flash has much higher limits and
  finishes alongside.
- **Judge speed.** Morph's public docs list no "Kimi K3.1 Pro Fast" model.
  `morph-kimik3-fast` serves Kimi K3, a different model. Judging is bound by
  the Ultra token-per-minute limits, not decode speed, so a faster-serving
  variant would not shorten it.

## Cheaper options considered (not applied)

- **Fewer results per search.** No saving. Exa charges the same up to 10
  results, Context 1 credit per 10, and Firecrawl 2 credits per 10. The
  snippet check also uses all 10.
- **Two passes instead of three.** Saves at most $1.92 and 192 Firecrawl
  credits. It halves the samples per item behind each score. Kept at three
  (see above).
- **Exa `type: "fast"`.** About 43% cheaper on Exa, but it tunes one
  provider in the headline. It is a candidate in Exa's tuning space instead.
- **The tuned condition on every item and pass.** 576 more Firecrawl
  credits; it does not fit. On every item for one pass: 192 credits, which
  leaves nothing for tuning. Applied instead: 32 seeded items, pass 1.

## What it tells us

- **Spec mistakes**, from the smoke check, before any real spend.
- **Variance:** pass-to-pass agreement, result-URL overlap, and the real
  width of the intervals with three samples per item.
- **Judges:** self-consistency kappa (Kimi), cross-judge kappa (Kimi
  against DeepSeek), each provider's judged score under both, and
  judge-human kappa once labels exist. Together these decide whether judged
  scores can be published.
- **Timing:** how far apart the providers were queried for the same item,
  as median, p95 and maximum.
- **Real costs:** actual against reserved per provider, and the share of
  reported, computed and unknown costs.
- **Failures:** empty, 429, timeout and setup-error rates per provider.
- **Page reach:** the unreadable-page rate with reasons, overall and per
  provider.
- **Tuning:** whether any documented setting clearly beats a provider's
  default on the split, and by how much on the scored subset.

## The seven-provider pilot

`config/pilot.json` runs all seven registry providers, two passes, at most
$7.30 under a $45 cap. It waits until all seven keys are in hand. The same
commands work with `--config config/pilot.json --confirm-spend 45`. It has no
tuned condition; `config/tuning.json` already holds search spaces for all
seven providers.
