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

# 3. Plan: calls, maximum spend and Firecrawl credits used so far. Sends nothing.
node --env-file=../.local/bench/keys.env src/cli.ts plan --config config/first.json

# 4. Live run: prints the plan again, checks every key, then runs search, pages, both judges and scoring.
BENCH_ALLOW_LIVE=1 node --env-file=../.local/bench/keys.env src/cli.ts run --config config/first.json --live --confirm-spend 7

# 5. Resume after an interruption. Finished calls are not repeated; resumed calls count against the same cap and credit limit.
BENCH_ALLOW_LIVE=1 node --env-file=../.local/bench/keys.env src/cli.ts run --config config/first.json --live --confirm-spend 7 --resume <runId>

# 6. Human check: grade at least 100 judged pairs blind, which takes about an hour. Quit and rerun at any time.
node --env-file=../.local/bench/keys.env src/cli.ts label --run <runId>

# 7. Publish: writes results.json, attempts.jsonl, leaderboard.json and routing-table.json.
node --env-file=../.local/bench/keys.env src/cli.ts publish --run <runId>
```

Without `MORPH_API_KEY`, step 4 is refused, and the message names the way
out. To run without judging, add `--no-judge` to steps 1, 3, 4 and 5. The
run is then named `first-notjudged`, and the plan, the printed scores and
`results.json` (`"judging": "not judged (--no-judge)"`) all say it was not
judged. Known-answer scoring, which sets the rank, is unchanged. A resumed
run must use the same choice. Step 6 has nothing to label in an unjudged
run.

Morph's Ultra period ends on 2026-12-09. Finish steps 4 and 5 before then:
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
- **Firecrawl:** held to 800 credits counted from 2026-11-25. The count
  includes smoke checks, this run and its resumes.

### Why three passes

Owner's brief: multiple samples, but cheap. Two passes give one test-retest
comparison. Three passes also make each item's score a mean of three draws,
which cuts the within-item noise that a single reply carries. No live data
yet shows that two passes are enough, because the pilot never ran. The third
pass costs at most $1.92 and 192 Firecrawl credits, and it fits both the
cap and the credit limit. Every provider gets the same three passes. The
Firecrawl limit leaves room for all of them, so no provider gets fewer
samples than another.

## Most it can spend: $5.76, under a $7 cap

Dry run of `node src/cli.ts plan --config config/first.json` (method 0.3.0):

```text
search                      calls  reserve per call (SDK cost bound)         max
exa (default)                 288  $0.0070 = bound                         $2.02
context (default)             288  $0.0030 = bound                         $0.86
firecrawl (default)           288  $0.0100 = bound                         $2.88
tinyfish (default)            288  $0.0000 = free allowance, overage off    $0.00
search subtotal              1152                                          $5.76

provider credits (the provider's own units; limits count every run and smoke check in the ledger):
  context   1 per call x 288 calls = 288 credits
  firecrawl 2 per call x 288 calls = 576 credits; limit 800 since 2026-11-25, 0 used, 224 to spare

not charged (outside the spend total):
  pages: at most 3456 URLs through the harness's own fetcher (plain-1; no provider, 4 in flight, 1000 ms between calls to one host)
  judge morph-kimi-k3.1-pro: 1152 pairs + 173 repeats, covered by plan; any charge the judge reports halts the run
  check judge morph-deepseek-v4.1-flash: 1152 pairs, covered by plan; same halt rule

maximum possible spend $5.76; run cap $7.00; monthly cap $100.00
pacing: exa 400 ms/2 in flight; context 12000 ms/1 in flight; firecrawl 12000 ms/1 in flight; tinyfish 14400 ms/2 in flight
```

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
  searches a day is not published. This run and its smoke check use about 290. The cap $7
  is the $5.76 worst case rounded up with about 20% room for resumed calls.
- **Expected spend.** Exa reports about $0.007 per search, so about $2.02.
  Context costs 288 credits, about $0.58 at the Developer price, or nothing
  on remaining plan credits. Firecrawl draws about 581 credits (576 for the
  run, 5 for the smoke check) from the owner's existing balance, so no new
  cash; the ledger still counts them at list price. Expected new cash is
  roughly $2 to $2.60.
- **Firecrawl credits.** Firecrawl's docs: a search costs 2 credits per 10
  results, rounded up, and scrapes each result only when `scrapeOptions` is
  sent. The registry spec never sends it, and a run cannot add it to the
  headline. A scrape costs 1 credit. Run plus smoke use 581 of 800, which
  leaves 219 credits, or about 109 resent searches, for resumes. The limit
  stops Firecrawl alone before it would pass 800; the others finish.
- **Free parts.** Page reads cost nothing: they use the harness's own
  fetcher. Judging adds no spend: Ultra covers both judges, the cap counts
  provider calls only, and any charge a judge reports halts the run.

## Run time

About 5 to 6 hours, unattended. A VM suits it.

- **Search, about 70 minutes.** Each provider is held to half its strictest
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
  provider in the headline. It belongs in the `tuned` profile, not here.

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

## The seven-provider pilot

`config/pilot.json` runs all seven registry providers, two passes, at most
$7.30 under a $45 cap. It waits until all seven keys are in hand. The same
commands work with `--config config/pilot.json --confirm-spend 45`.
