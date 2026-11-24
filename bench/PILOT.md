# Pilot plan

One command, once the keys are set:

```sh
cd bench && npm ci
export BENCH_ALLOW_LIVE=1 BRAVE_API_KEY=… CONTEXT_DEV_API_KEY=… EXA_API_KEY=… FIRECRAWL_API_KEY=… \
  PERPLEXITY_API_KEY=… TAVILY_API_KEY=… TINYFISH_API_KEY=… MORPH_API_KEY=…
node src/cli.ts pilot --config config/pilot.json --live --confirm-spend 45
```

It prints the plan below, checks every key, then runs search, page fetches,
judging and scoring. Run `npm run pilot:plan` first to see the plan alone. If
interrupted, rerun with `--resume <runId>`: finished calls are not repeated.
Afterwards, label at least 100 pairs (`bench label --run <runId>`, about an
hour), then `bench publish --run <runId>`.

## What it runs

- **Providers:** all seven in the registry: Brave, Context.dev, Exa,
  Firecrawl, Perplexity, Tavily and TinyFish.
- **Items:** 96, namely the seed set (86) and the November freshness set (10).
- **Passes:** each item goes to each provider twice, so 1,344 searches.
- **Pages:** the top 3 result pages are fetched through Exa contents.
- **Judging:** 30 items are judged, with 15% of pairs judged twice.

## Most it can spend: $42.53, under a $45 cap

| Part | Arithmetic | Max |
| --- | --- | --- |
| Search, known prices | 192 calls each × list price × 1.5: Brave $0.0075, Context $0.0030, Exa $0.0105, Firecrawl $0.0114, Perplexity $0.0075, Tavily $0.0120 | $9.96 |
| Search, TinyFish | 192 × $0.05 (price not public: worst case) | $9.60 |
| Pages | 2 passes × 96 items × 7 providers × 3 URLs = 4,032 × $0.0015 | $6.05 |
| Judge | (630 pairs + 95 repeats) × $0.0233 (about 6,000 input tokens at most, at $2.50/M, plus 600 output tokens at $14/M) | $16.92 |
| **Total** | | **$42.53** |

Expected spend is lower. The figures above assume no URL is fetched twice
and every call costs 1.5 times list price. On an Ultra seat, the judge costs
nothing; declare it with `"creditsUsd": {"judge:morph-kimi-k3.1-pro": 17}` to
free that headroom.

## Run time

At half of each documented limit, the search takes about 45 minutes; the
slowest is TinyFish at 14.4 s per call. Judging takes about 2 hours under
Ultra's token limits. With a paid Context or Firecrawl plan, add
`"rateLimitPlans": {"context": "Developer"}` to `config/pilot.json`.

## What it tells us

- **Variance:** test-retest agreement and result-URL overlap between the
  two passes, and the real width of the intervals. Together these say
  whether 400 items can separate providers 6 points apart.
- **Judge:** self-consistency kappa, and judge-human kappa once labels
  exist. This decides whether judged scores can be published.
- **Real costs:** actual against reserved per provider, the share of
  reported, computed and unknown costs, and what TinyFish really charges.
- **Failures:** empty, 429, timeout and setup-error rates. Any registry
  spec that fails against the live API shows up here.
- **Fetcher bias:** page-fetch failure rate per provider.
