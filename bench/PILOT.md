# Pilot plan

The pilot waits until all seven provider keys are in hand. Nothing here has
run live. Then it is one command:

```sh
cd bench && npm ci
export BENCH_ALLOW_LIVE=1 BRAVE_API_KEY=… CONTEXT_DEV_API_KEY=… EXA_API_KEY=… FIRECRAWL_API_KEY=… \
  PERPLEXITY_API_KEY=… TAVILY_API_KEY=… TINYFISH_API_KEY=… MORPH_API_KEY=…
node src/cli.ts pilot --config config/pilot.json --live --confirm-spend 45
```

It prints the plan below, checks every key, then runs search, page reads,
judging and scoring. Run `npm run pilot:plan` first to see the plan alone. If
interrupted, rerun with `--resume <runId>`: finished calls are not repeated.
Afterwards, label at least 100 pairs (`bench label --run <runId>`, about an
hour), then `bench publish --run <runId>`.

## What it runs

- **Providers:** all seven in the registry: Brave, Context.dev, Exa,
  Firecrawl, Perplexity, Tavily and TinyFish.
- **Items:** 96, namely the seed set (86) and the November freshness set (10).
- **Passes:** each item goes to each provider twice, so 1,344 searches.
- **Pages:** the top 3 result pages are read by the harness's own fetcher
  (plain GET, robots.txt obeyed), not by any provider.
- **Judging:** every item, covered by the Morph Ultra plan, with 15% of
  pairs judged twice.

## Most it can spend: $7.30, under a $45 cap

Dry run of `node src/cli.ts plan --config config/pilot.json` (method 0.2.0):

```text
search                      calls  reserve per call (SDK cost bound)         max
brave (default)               192  $0.0050 = bound                         $0.96
context (default)             192  $0.0030 = bound                         $0.58
exa (default)                 192  $0.0070 = bound                         $1.34
firecrawl (default)           192  $0.0100 = bound                         $1.92
perplexity (default)          192  $0.0050 = bound                         $0.96
tavily (default)              192  $0.0080 = bound                         $1.54
tinyfish (default)            192  $0.0000 = free allowance, overage off    $0.00
search subtotal              1344                                          $7.30

not charged (outside the spend total):
  pages: at most 4032 URLs through the harness's own fetcher (plain-1; no provider, 4 in flight, 1000 ms between calls to one host)
  judge morph-kimi-k3.1-pro: 2016 pairs + 303 repeats, covered by plan; any charge the judge reports halts the run

maximum possible spend $7.30; run cap $45.00; monthly cap $100.00
```

Each reservation is the SDK's cost bound: the highest documented rate for
10 results. Context's is its $3-per-1,000 overage credit and Firecrawl's its
Hobby extra credits ($0.005 each), so both sit above their plan prices.
TinyFish is free within 12,000 searches a day; its $0 bound holds only while
wallet spending stays off on the account, because the price past the
allowance is not published. The cap counts provider calls only: pages cost
nothing, and the judge halts the run if it ever reports a charge.

## Run time

At half of each documented limit, the search takes about 45 minutes; the
slowest is TinyFish at 14.4 s per call. Page reads take about as long, held to
one request per host per second. Judging paces itself to half of Ultra's
token limits from each reply's token counts: at the earlier estimate of about
10 seconds a call, 2,319 calls take 6 to 7 hours. It runs headless, so a VM
suits it.
With a paid Context or Firecrawl plan, add
`"rateLimitPlans": {"context": "Developer"}` to `config/pilot.json`.

## What it tells us

- **Variance:** test-retest agreement and result-URL overlap between the
  two passes, and the real width of the intervals. Together these say
  whether 400 items can separate providers 6 points apart.
- **Judge:** self-consistency kappa, and judge-human kappa once labels
  exist. This decides whether judged scores can be published.
- **Real costs:** actual against reserved per provider, and the share of
  reported, computed and unknown costs.
- **Failures:** empty, 429, timeout and setup-error rates. Any registry
  spec that fails against the live API shows up here.
- **Page reach:** the unreadable-page rate with reasons, overall and per
  provider.
