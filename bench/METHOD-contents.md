# searchSDK Benchmarks: contents track, method contents-0.1.0

Pre-registered 2026-11-25, before any scored contents run. Values come from
`config/contents-method.json`; the URL set's rules come from its builder spec
(`datasets/specs/contents-urls-0.1.0.json`). Changing any of them, or the
scoring code (`src/contents/`), is a new contents method version. The search
benchmark's method (METHOD.md, 0.4.0) is unchanged and separate; where this
document says "as in search", it names the METHOD.md section it reuses.

## 1. What is measured

The SDK's second call is `contents(urls)`: read pages the caller already
has. For each provider, its **default** contents call, made through the
searchSDK TypeScript runtime exactly as a user makes it: one URL per call, a
30-second deadline, no retries, no fallback, no provider options. Every
provider gets one URL per call, including those that accept batches, so
reliability, latency and failures are per page and comparable. The benchmark
measures the provider and its registry spec together.

Providers in the first run: Exa (`/contents`), Context.dev (`/v1/web/scrape`),
Firecrawl (`/v2/scrape`) and TinyFish (Fetch). Each spec's fixed request is
part of what is measured (Firecrawl sends `onlyMainContent: true`; Exa sends
`text: true`).

## 2. The URL set

A URL set is a committed, versioned file (`datasets/contents/`), listed with
its SHA-256 in `datasets/contents/manifest.json` and checked by
`bench contents validate`. Each URL carries its stratum, where it came from,
its answer key (aliases and patterns, as in search items), how its truth is
known, and what the harness saw when it was built (HTTP status, MIME type,
text length and hash, the answer's offset, a PDF's page count). The builder's
drops are committed beside it with their reasons.

### Where URLs come from

No URL is chosen from any provider's contents output, and none from a single
provider's search results.

- **Dataset pages** (public and fresh sets only; never a private or
  navigational item): the second-source pages the dataset cross-check found
  the answer on (Wikipedia articles, release notes, CVE records), recorded in
  each item's review note; and the items' own cited pages (PEPs, endoflife.date
  products, arXiv abstracts and PDFs, CVE records).
- **Extra open records**, under the same licences as the datasets: KEV
  entries added before 2026 (CC0), each kept only when its CVE record's CNA
  container (`cveawg.mitre.org`) states the answer; and arXiv papers (metadata
  CC0) first posted 60 to 95 days before the build, so they share nothing with
  the fresh set.
- **Pooled pages**: pages the harness's own fetcher read in finished search
  runs, from public and fresh items only, whose harness text holds the item's
  answer. Each provider in `pooledProviders` contributes the same number, from
  its own top-3 results, drawn round-robin in a seeded order and de-duplicated.
  When one provider has fewer, every provider keeps only that many. When any
  provider has none (its run has not finished), the stratum stays empty:
  pooling from some providers only would favour them.

### Strata

Five strata, each up to 60 URLs (`quotas`). Every stratum is published
separately; one below 30 paired URLs is published as too small, never as a
score.

| Stratum | Pages | Truth |
| --- | --- | --- |
| `reference` | dataset HTML pages under 30,000 characters of harness text | the harness text holds the answer |
| `long` | dataset HTML pages of at least 30,000 characters | the harness text holds the answer |
| `pooled` | search-run pages, the same count from each provider | the harness text holds the answer |
| `js` | client-rendered pages: 2xx to the harness, but its plain GET does not show the answer (CVE records on cve.org) | the record states the answer (the dataset review or the CVE record's CNA data) |
| `pdf` | arXiv PDFs of at most 10 pages, counted by the harness from the file (read whole, up to 25 MiB, page trees in compressed object streams included) | the paper itself (its first author) |

Selection within a stratum follows one seeded order. No site (registrable
domain) supplies more than half of a stratum while other candidates remain.

### Robots.txt and unreadable pages

The harness reads every candidate with the search benchmark's fetcher
(METHOD §5: robots.txt obeyed for the harness's token or `*`, host checks,
redirects, deadline, byte limit). A URL whose robots.txt disallows the harness
is left out of the set for everyone: no provider is asked to fetch a page our
own fetcher may not read, so a provider gains or loses nothing by its own
crawler's robots policy. A dataset page the harness cannot read, or whose
text lacks the answer, is dropped with its reason.

## 3. Conditions

- **Passes.** Three. Every pass is scored.
- **Order.** URLs run in a seeded order, reshuffled each pass. For each URL
  the harness first probes the page (the same fetcher, one request per host at
  a time, at least one second or the host's Crawl-delay apart). Then all
  providers' calls for that URL are dispatched together in a seeded provider
  order that differs per URL and pass, each under its own pacer. At most 4
  URLs are in flight. The spread between the first and last start for the
  same URL is published.
- **Availability.** A page the probe finds down (non-2xx, network, timeout)
  or disallowed in a pass is unavailable that pass for every provider: no
  calls are sent and nobody is scored on it. A 2xx answer of another type
  (PDF) or a 2xx with no text (client-rendered) counts as there.
- **Truth per pass.** For `harness` truth, the probe checks that the page
  still states the answer. When it no longer does, the URL leaves the paired
  fidelity set for everyone. Calls still count for reliability.
- **Pacing.** Half of each provider's strictest documented contents limit
  (registry `contents.rateLimits`, URLs as the unit), as in search (METHOD
  §3). A 429 pauses that provider for `Retry-After` or 30 seconds.
- **Where.** Started by hand, never by CI.

## 4. Outcomes

Each call has exactly one outcome: search's taxonomy (METHOD §4) plus one.

| Outcome | Meaning | Fidelity | Reliability |
| --- | --- | --- | --- |
| `ok_nonempty` | the page came back with text | scored | usable |
| `ok_empty` | the page came back blank | 0 | against |
| `page_failed` | a 2xx in which the provider reports the page failed (target error, blocked, missing) | 0 | against |
| `rate_limited`, `timeout`, `server_error`, `network_error`, `invalid_response` | as in search | 0 | against |
| `setup_error`, `aborted`, `harness_error`, `local_network` | as in search | not scored | not counted |

A network failure is ours when the connectivity probe fails or another
provider failed to connect within 10 seconds (METHOD §4); such calls are
retried on resume.

## 5. Scores

- **Fidelity (ranked).** A call scores 1 when it is `ok_nonempty` and the
  returned content or title holds the URL's known answer, by the search
  benchmark's matcher (METHOD §5: normalized, word-bounded aliases, version
  patterns). A URL's score is its mean over the three passes. A URL counts
  only when, in every pass, the page was available, its truth held, and every
  provider has a scored call (pairing). Intervals: 95% paired bootstrap over
  URLs, 2,000 replicates, seed 20261124.
- **Reliability.** Usable rate: `ok_nonempty` ÷ scored calls, with a Wilson
  interval; every outcome's rate is published. Below a 95% floor (upper bound)
  a provider is unreliable and ranks below every reliable one.
- **Rank.** As in search (METHOD §9): fidelity within reliability bands; a
  provider ties with its group's leader unless the paired difference's
  interval excludes zero and is at least 6 points. Each stratum is ranked the
  same way, for the per-stratum table.
- **Completeness and noise** (columns, never rank), on `ok_nonempty` calls for
  pages with harness truth and at least 500 characters of harness text. Texts
  are normalized as for matching and cut into word 4-grams; Markdown link
  targets, image syntax and bare URLs are removed from provider text first.
  - *passage recall*: the share of the answer passage's 4-grams (400
    characters either side of the answer in the harness text) that the
    provider's text contains: did the content around the answer survive?
  - *page coverage*: the share of the harness text's 4-grams the provider
    kept. Main-content extraction lowers it on purpose (menus, footers), so it
    is shown, not judged.
  - *extraneous*: the share of the provider's 4-grams that are not in the
    harness text: text not on the page as served.
  - *length ratio*: the median of provider length ÷ harness length.
- **Own-pool check.** On the `pooled` stratum, each provider's fidelity on
  pages pooled from its own search results and on the others'. A provider
  that reads its own results better (an index or cache advantage) shows here.
- **Latency.** Wall-clock around the SDK call; `ok_nonempty`, `ok_empty` and
  `page_failed` are measured, a timeout counts as the 30-second deadline, and
  other errors are rates. p50, p90, p95.
- **Cost.** The SDK's per-attempt cost (reported, else list price), per page
  and per correct page, with counts by cost source. Unknown is unknown, never $0.
- **Retest.** The share of paired URLs whose score changed between passes 1
  and 2.

## 6. Spend

As in search (METHOD §10): every call reserves its worst case in the shared
month-wide ledger before it is sent; the run and month caps, declared credits
(`creditsUsd`), provider limits in credits or calls (`providerLimits`, counted
across every run and smoke check), commits of the actual cost, the overrun
halt and the crash rule are the same code. A live run needs
`BENCH_ALLOW_LIVE=1`, every key, no `CI`, the printed plan and
`--confirm-spend` equal to the cap.

The reservation is the SDK's cost bound for one URL. **Documents:** a PDF of
N pages reserves (1 + N) times that bound, for every provider, because a
provider may bill per document page (Firecrawl documents one credit per PDF
page, and charged 8 credits for an 8-page arXiv PDF on 2026-11-25; Exa,
Context.dev and TinyFish charged their per-URL price). Credits scale the same
way. The plan prints both figures: the worst case with the document factor,
and the per-URL worst case that holds for a provider whose bill does not grow
with pages. TinyFish is free within 1,000 fetched URLs a day; its $0 bound
holds only while wallet spending past the allowance is off, and the plan says
so.

## 7. Outputs

`bench contents publish` writes `contents-results.json` (scores per provider
and stratum, the URL list with strata and origins, spec versions and
verification status, the URL set's hash) and `contents-attempts.jsonl` (one
record per call: outcome, status, timing, cost, credits, content length and
hash, whether the answer was found). No page text, title or provider response
is published; publish scans the output for every stored content and probe
text and refuses on a match. Raw text stays in the store. Fixture runs say
`"mode": "fixture"` and `"liveVerified": false`.

## 8. Bias controls

- **URLs independent of every ranked provider.** Dataset pages and open
  records involve no provider. Pooled pages come from search results read by
  the harness, the same number per provider, and the own-pool check publishes
  whether a provider reads its own results better.
- **Ground truth independent of every ranked provider.** Dataset answers,
  checked in the harness's own text where it can read the page, or stated by
  the cited record for client-rendered pages and PDFs. No provider's text ever
  sets a truth.
- **Same request.** One URL, the default call, the same deadline, no retries,
  no fallback, no options.
- **Same conditions.** Seeded URL and provider order, calls for a URL
  dispatched together, neutral pacing, three passes.
- **Same availability and robots rule.** Disallowed URLs are not in the set;
  a page down in a pass is excluded for everyone.
- **Same matching and scoring code** for every provider; cost and latency
  never move a rank.

Residual biases, not removed:

- **Caches.** Providers may serve a cached copy (Firecrawl's default maxAge is
  two days, Exa uses a cached copy of any age when it has one, Context.dev
  three days). That is their default behaviour and is measured as such; the
  per-pass truth check catches a page that changed.
- **One site for `js`.** Client-rendered pages with independent known answers
  are rare; the stratum is CVE records on cve.org, so it measures rendering
  of one application.
- **`pdf` is arXiv papers of at most 10 pages**, chosen so per-page billing
  stays bounded; longer documents are not measured.
- **Wikipedia is common** in `reference` and `long` (the cross-check reads
  Wikipedia), capped at half a stratum while other sites remain.
- **Completeness is measured against a plain GET.** Text a browser adds
  after load counts as extraneous on the pages where the harness reads text.
- **Pooled pages were found by search**, so they lean toward pages search
  indexes hold; the own-pool check makes any advantage visible.

## 9. Size and cost

Up to 300 URLs, 3 passes, 4 providers: 3,600 calls. At list prices: Exa
$0.001 a page (at most $0.90), Context.dev at most $0.003 a page ($2.70),
Firecrawl one credit a page plus one per PDF page (sponsor credits), TinyFish
free within its daily allowance. `bench contents plan` prints the calls,
credits, maximum spend per provider and in total, and the expected duration
(about three hours, set by the 10-requests-a-minute Free limits of Context.dev
and Firecrawl).

## 10. Versions

contents-0.1.0 is the first version. The URL set has its own version
(`contents-urls-0.1.0`); a rebuild with a different seed, sources or date is
a new set version and is compared only with runs on the same set.
