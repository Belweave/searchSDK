# searchSDK Benchmarks: method 0.3.0

Values in this document come from `config/method.json`. Changing any of them,
the rubric or the scoring code is a new method version.

## 1. What is measured

One normalized `search` call per item, provider and profile, made through the
searchSDK TypeScript runtime exactly as a user would make it: `maxResults` 10,
a 10-second deadline, no retries, no fallback, and no options beyond the
profile's settings. The benchmark measures the provider and its registry spec
together, as users get them.

Two profiles:

- **default**: nothing set. This is the headline.
- **tuned**: the best settings found by tuning (section 8), within a list-price
  cap per call. Published beside the headline with its exact settings.

## 2. Items

An item is one query with a verifiable answer (`schemas/item-1.schema.json`):
query, class, language, aliases or a pattern or official URLs, source and
statement, licence, the date the answer was true, and review status.

| Class | Question | Source (all Wikidata, CC0-1.0) |
| --- | --- | --- |
| `fact.head` | capital of a well-linked country; author of a Nobel laureate's notable work; director of a Best Picture winner | P36, P50, P57 |
| `fact.tail` | author of a work in a smaller language; director of a film from a smaller industry; 2 to 6 sitelinks | P50, P57 |
| `multihop` | birthplace of the director or author of a named work | P57 or P50, then P19 |
| `tech` | designer of a programming language; developer of a piece of software | P287, P178 |
| `nav` | official website of a university | P856 |
| `nonen` | capital of a country, asked in French, German, Spanish or Japanese, answered in that language | P36 |
| `fresh` | latest stable version of a piece of software released in the last 45 days | P348 with P577 and P548 |

Rules:

- A subject is used only when it has exactly one current value for the asked
  property, so each item has one answer. The statement ID is recorded.
- The answer may not appear in the query.
- Latin aliases shorter than four letters, or all lowercase, are dropped:
  they match unrelated text.
- Candidates are drawn at random by seed within each template, never by how
  providers do on them.
- A committed review file (`datasets/review/`) lists every dropped candidate
  with its reason and every pruned alias list. Reviewed items say who
  reviewed them (`agent-reviewed` or `human-verified`); items nobody could
  check stay `builder-checked`.
- Every committed set is listed in `datasets/manifest.json` with its SHA-256.
  Changing a file without a new version fails validation.

### Splits

- **Public** (about 250): committed, with full text.
- **Private** (about 100): built the same way, turned private by
  `dataset private`, which gives each item a new opaque ID and a random
  128-bit nonce. Items live only in the local store. The repository holds
  the SHA-256 of each item's canonical JSON, nonce included
  (`datasets/private-manifest.json`). Published results name private items
  by that hash and publish no result URLs for them. A retired item is
  published with its nonce, so anyone can check it against the old hash.
  Every run sends private queries to every provider, so a quarter of them
  are replaced each quarter.
- **Fresh** (about 50 a month): built just before the run from the last 45
  days of data. They expire 30 days after building. The superseded versions
  are kept to measure stale answers.

### The full set of 400

The seed set holds 86 public and 10 fresh items. To reach the monthly 400:

1. Raise the template counts in a new public spec to about 250 items, keeping
   the class shares (roughly 15% for each class). Build, review, commit.
2. Build about 100 more with a different seed into the local store and run
   `dataset private`; commit only the manifest.
3. Each month, build the fresh set with a new spec version (`fresh-YYYY-MM`)
   and review it. Software versions alone yield about 10 usable items a
   month after review, so 50 needs more freshness templates first (section
   13).

## 3. Conditions

- **Order.** Items run in a seeded random order, reshuffled for each pass.
  All of an item's calls are dispatched together, in a seeded provider order
  that differs per item and pass, and run concurrently, each under its own
  provider's pacing. At most 4 items are in flight. The spread between the
  first and the last provider's start for the same item is published (median,
  p95, max), so freshness drift between providers is measured, not assumed.
- **Pacing.** Each provider is held to half of its strictest documented rate
  limit for the chosen plan (the most restrictive one when no plan is
  named). A 429 under that pacing is the provider's failure. After one, the
  provider pauses for `Retry-After` or 30 seconds.
- **Passes.** A run may send every item to every provider several times
  (`passes`). Every pass is scored: an item's known-answer score is its mean
  over the passes, and an item counts only when every pass scored it. The
  page check covers every pass or none. The first run uses three passes;
  monthly runs use one.
- **Where.** Runs are started by hand, never by CI, on the owner's machine
  or a VM. `BENCH_REGION` is recorded.

## 4. Outcomes

Each call has exactly one outcome.

| Outcome | Meaning | Quality | Counts against reliability |
| --- | --- | --- | --- |
| `ok_nonempty` | at least one result | scored | no |
| `ok_empty` | a valid, empty list | 0 | yes |
| `rate_limited` | 429 or quota | 0 | yes |
| `timeout` | deadline passed | 0 | yes |
| `server_error` | 5xx or a provider error | 0 | yes |
| `network_error` | connection failed | 0 | yes |
| `invalid_response` | a 2xx the spec cannot read, or too large | 0 | yes |
| `setup_error` | our key, request or option was wrong | not scored; the provider stops until fixed | no |
| `aborted`, `harness_error` | we interrupted it, or our bug | not scored; rerun on resume | no |

Empty results, errors, timeouts and rate limits all score zero. The old
benchmark counted empty responses as successes. Here an always-empty
provider scores zero and ranks last.

## 5. Known-answer score (objective)

For each attempt (an item's score is the mean over its passes):

- **Non-nav items** score 1 when an alias or pattern matches in the title and
  excerpts of any of the top 10 results, or in the text of any of the top 3
  result pages. Otherwise they score 0.
- **Nav items** score 1 when one of the top 3 result URLs is on the official
  host or one of its subdomains.

Matching first normalizes both texts: NFKC, lowercase, Latin, Greek and
Cyrillic diacritics removed, punctuation and symbols turned into spaces.
Aliases must match on word boundaries. For Han, kana and Thai, a substring
match is enough. Version patterns reject longer versions, so 1.6.11 matches
neither 1.6.110 nor 1.6.11.2.

Page text comes from the harness's own plain fetcher (`src/pages/fetcher.ts`),
never from a ranked provider. Each distinct top-3 URL (by the SDK's URL key)
is fetched once per run:

- an HTTP GET with the user agent `BenchPageFetcher/1.0 (compatible; …;
  obeys robots.txt)`, which names no person, project or contact;
- robots.txt is read once per host and obeyed (RFC 9309): our own group if it
  names `BenchPageFetcher`, else `*`; the longest rule wins and allow wins a
  tie. No robots.txt (4xx) allows everything; an unreachable one (5xx, 429,
  network failure, timeout) disallows everything. A Crawl-delay up to 30
  seconds is honoured; a longer one makes the host unreadable;
- one request per host at a time, at least one second apart, four in flight;
- at most 5 redirects, each hop checked again (scheme, host, robots.txt);
- before each hop (robots.txt included) the host name is resolved and refused
  when any of its addresses is loopback, private, link-local, cloud metadata,
  multicast or otherwise reserved, in IPv4 or IPv6, including IPv4 embedded
  in IPv6 (mapped, compatible, NAT64, 6to4). The connection then goes only to
  an address that passed the same check at connect time, so a name that
  re-resolves to a private address (DNS rebinding) is refused too;
- a 20-second deadline per page; the first 5 MiB of the body is read;
- only `text/html`, `application/xhtml+xml` and `text/plain`; the charset
  comes from the header, a byte order mark or a `<meta>` tag; scripts,
  styles and markup are removed.

A page it cannot read is **unreadable**, with a reason (robots, status,
content type, redirects, timeout, network, empty, blocked URL). An unreadable
page contains no answer for every provider alike, since all providers share
the same fetch of a URL. Published: the overall unreadable rate with counts
by reason, and each provider's unreadable share among its own top URLs. The
fetcher costs nothing and is not in the spend plan.

Reported: the score, plus its snippet part and its page part. Snippet credit
depends on what a provider's excerpts are (registry `excerptKind`:
description, content chunk or highlights), so that kind is published beside
each provider's score.

## 6. Judged relevance

- **Pool.** On the judged items (pass 1, default profile), each provider's
  top 3 URLs are pooled. A URL whose page the harness read is one pair,
  shared by every provider that returned it (de-duplicated by the SDK's URL
  key). A URL the harness could not read is one pair per provider, judged on
  that provider's own title and excerpts, so one provider's snippet never
  grades another provider's result. When the judge is covered by a plan,
  every item is judged; otherwise a seeded sample within classes keeps the
  cost down.
- **Passage.** For a read page the judge sees the query, the URL, the title
  the harness read and up to 4,000 bytes of the page text: the
  paragraph-aligned window holding the most query terms. For an unreadable
  page it sees the query, the URL and that provider's title and excerpts. The
  published `pageShare` says how often the page was used.
- **Blind.** The judge never learns which provider returned a page: no
  provider name or id, no rank or position, no other provider's results. It
  grades one pair per call, in a seeded order across all pairs, so position
  bias cannot follow a provider. URLs are shown without a fragment and
  without `utm_*` parameters, which some APIs add to name themselves.
- **Grades.** Grades follow `rubric/relevance-1.0.0.md` (0 to 3). The
  rationale comes before the grade.
- **Score.** nDCG@3 with gain 2^g − 1. The ideal is the best 3 distinct
  URLs anyone returned for the item (a URL judged on several snippets counts
  once, at its best grade). Items where nobody returned anything
  relevant are dropped. A failed or empty response scores 0. Items with any
  unresolved pair are left out, and the count is published.
- **Judge.** Kimi K3.1 Pro (`morph-kimik31`) through Morph's
  OpenAI-compatible endpoint, with `reasoning_effort` low, at most 600 output
  tokens, and JSON-schema output. Temperature and top_p are not sent: the
  host fixes them. Judges are pluggable (`config/judges.json`).
- **Self-consistency.** 15% of pairs, chosen by seed, are judged twice. The
  quadratic-weighted kappa between the two passes is published.
- **Human check.** `bench label` shows a seeded sample of judged pairs, one at
  a time. It shows the same passage the judge saw, with no provider and no
  judge grade, and records 0 to 3. Judge-human agreement is the quadratic
  weighted kappa with a bootstrap interval, plus the exact-agreement rate.
- **Gate.** Judged scores are published only with at least 100 human labels,
  judge-human kappa ≥ 0.60 and self-consistency kappa ≥ 0.80. Otherwise the
  judged columns are withheld with the reason. The known-answer score,
  reliability, latency and cost are published either way.

One judge model means there is no cross-vendor check. That is why the
objective score alone decides rank (section 9), and why the gate exists.

## 7. Reliability, latency, cost

- **Usable-response rate:** `ok_nonempty` ÷ scored attempts, over all
  passes, with a 95% Wilson interval. Every outcome's rate is published.
- **Latency:** wall-clock time around the SDK call, measured with a
  monotonic clock. Pacing waits are excluded. Successful and empty calls
  count as measured. A timeout counts as the deadline (censored), so a
  provider that times out cannot look fast. Other errors are excluded and
  reported as rates. Published as p50, p90 and p95.
- **Cost:** the SDK's per-attempt cost: the provider's reported figure, else
  the registry's list price (the SDK's `listPrice`). Every billed attempt counts, including
  `possible` ones (timeouts, network failures). Published as cost per query
  and cost per correct answer, with counts by cost source and by billing
  certainty. An unknown price is shown as unknown, never as $0.

Cost and latency are columns. They never affect rank.

## 8. Tuning

`bench tune` runs a seeded sample of 30 public items. It runs each provider's
default and every candidate in `config/tuning.json`. Candidates use only
documented options. A candidate runs only if the SDK can bound its cost per
call (`costBound`) and the bound is at most $0.02. For each provider, the candidate with the best
known-answer score wins. A tie goes to the cheaper option, then to default.
Unreliable candidates cannot win.

The monthly run adds the `tuned` profile from the selection file. It scores
that profile without the 30 tuning items, so the choice is not graded on the
items it was chosen with. Tuning spend goes through the same ledger and caps.

## 9. Statistics and ranking

The owner confirmed these rules on 2026-11-24: the known-answer score sets the
rank and judged relevance is a gated column; a tie needs both statistical
separation and at least 6 points; a provider is unreliable below a 95%
usable-response floor.

- **Pairing.** Every provider is scored on the same items. An item missing
  for any ranked provider is dropped from that profile's comparison, and the
  count is published. A provider scored on fewer than 90% of items is marked
  `incomplete` and not ranked.
- **Intervals.** 95% percentile intervals come from a paired bootstrap over
  items: 2,000 replicates, seed 20261124. Each replicate draws the same
  items for every provider, so a difference keeps the item-level
  correlation.
- **Reliability bands.** A provider is unreliable when the upper end of its
  usable-rate Wilson interval is below 0.95. Unreliable providers are marked
  and ranked below every dependable provider, whatever their quality.
- **Ties.** Within each band, providers are sorted by known-answer score. A
  provider joins the current group unless it is separable from the group's
  leader. Separable means two things hold: the interval of the paired
  difference excludes zero, and the difference is at least 6 points. Tied
  providers share a group number and are shown as tied, with intervals.
- **Per class.** The same rule runs within each query class for the routing
  table.
- **Run-to-run change** (two or more passes): the share of items whose score
  changed between passes 1 and 2, and the mean Jaccard overlap of the two
  passes' result URLs. The headline already averages every pass.

## 10. Spend control

- **Ledger.** Every paid call reserves its worst case in a month-wide ledger
  before it is sent. For a search that is the SDK's cost bound for the exact
  request (`costBound`, registry/steps.md): the highest documented rate
  (overage, the dearest plan, the top of a published range) for the results
  asked for. No margin is added. Only a call the SDK cannot bound reserves
  $0.05, and the plan says so. Page fetches are free and reserve nothing.
- **Judge pricing** is a run setting (`judgePricing`). `covered-by-plan`, the
  default in the owner's configs because Morph Ultra covers Kimi K3.1 Pro,
  reserves nothing: the cap counts provider calls only, and the judge can
  score every item. Any charge the judge reports (`usage.cost` or
  `usage.total_cost`), or a 402 from it, halts the run. `list-price`, the
  default otherwise, reserves each call's request byte length as input
  tokens plus the full output cap, at list price.
- **Caps.** A call is refused when it could take the run past its cap or the
  month past $100 in cash. Cash is spend beyond the declared free credit of
  each account.
- **Commits.** After the call, the actual cost replaces the reservation. An
  unknown actual cost keeps the reservation.
- **Overruns.** An actual cost above its reservation halts the run: the price
  data is wrong.
- **Crashes.** A reservation never committed (a crash mid-call) counts in
  full.
- **The guarantee.** Spend stays under the cap as long as no provider bills
  above its highest documented rate. The first call that does stops
  everything. A bound for a free allowance (TinyFish) holds only while paid
  use past the allowance is off on the account; the plan prints that
  condition.
- **Starting a live run.** `BENCH_ALLOW_LIVE=1`, every key present, no `CI`,
  the printed plan, and `--confirm-spend` equal to the cap.
- **Credits.** Free credit per account (`creditsUsd`) is spent before cash.

## 11. Outputs

`bench publish` writes four files:

- `results.json` (`schemas/results-1.schema.json`)
- `attempts.jsonl`
- `leaderboard.json` (`schemas/leaderboard-1.schema.json`), read by the site
- `routing-table.json` (`schemas/routing-table-1.schema.json`): per provider,
  profile and class, with n, intervals, latency, reliability, cost, tie group
  and flags (`insufficient-n` below 30 items, `unreliable`, `cost-unknown`).
  It is valid for 45 days.

They contain scores, URLs, hashes of result text, timings, costs, settings,
dataset hashes, registry spec versions, the judge's prompt hash and the
harness commit. They never contain titles, snippets, page text or judge
rationales. Before writing, publish scans the output for every stored
result text, page text, rationale and private item, and refuses on any
match.

Raw responses, pages, judgments, labels and the ledger stay in the
git-ignored store (`.local/bench/`, or `BENCH_STORE`).

Fixture runs use synthetic providers and a synthetic judge. Their outputs
say `"mode": "fixture"` and `"liveVerified": false`, and must never be shown
as provider measurements.

## 12. Versions

- **Method:** semver in `config/method.json`. 0.3.0 scores every pass,
  judges unreadable pages per provider, titles read pages from the harness,
  and resolves page hosts before fetching. Major means scores are not
  comparable across versions; minor adds metrics, classes or providers;
  patch fixes bugs.
- **Datasets:** `name-version`, with a SHA-256 in the manifest.
- **Rubric:** a versioned file, recorded with its hash.
- **Judge:** model ID, parameters and prompt hash, recorded in every result.
- **Schemas:** a version in every file name and `schema` field.

## 13. Bias controls

Audited 2026-11-25 for anything that could favour one provider over another.
Each control below has a test in `test/bias.test.ts` or the suites it names.

Controlled:

- **Same request.** Every provider gets the item's query text unchanged, the
  same `maxResults` (10), the same 10-second deadline, no retries and no
  fallback. The headline profile sends no depth and no provider options; the
  only differences are each registry spec's fixed parameters, which are part
  of what is measured. TinyFish has no result-count parameter; it returns at
  most 10 and the runtime truncates.
- **Order and timing.** Provider order is seeded per item and pass; an
  item's calls run concurrently; item order is reshuffled per pass. The
  start-time spread per item is published (section 3).
- **Same pages.** Every provider's URLs are read by the same harness fetcher,
  once per URL key, in a seeded order, so the page check never uses a
  provider's own page text and an unreadable page is unreadable for everyone.
- **Same matching.** Known-answer matching runs the same normalization and
  aliases on every provider's text; URLs are de-duplicated with the SDK's
  URL key for everyone; nav items compare hosts the same way.
- **Same failures.** Empty lists, errors, timeouts and rate limits score 0
  for every provider; a timeout counts as the full deadline in latency.
- **No leaks between providers.** No response cache exists in the SDK. Raw
  responses, attempts and judgments are keyed by provider. Judge pairs are
  shared only through harness-read pages; snippet pairs are per provider.
  Read pages are titled by the harness, never by whichever provider answered
  first.
- **Blind, pointwise judging** (section 6).
- **Cost and latency never move a rank** (`cost never moves a rank`).
- **Several samples.** Each item is scored as the mean over its passes, and
  pass-to-pass change is published, so one noisy reply does not decide an
  item.

Residual biases, not removed:

- **Dataset.** Every item comes from Wikidata; head and multi-hop classes
  favour providers with strong encyclopedic coverage (section 2, Known limits).
- **Excerpt kind.** Snippet credit depends on what a provider's excerpts are
  (highlights, content chunks or descriptions); the page check and the
  published `excerptKind` offset but do not remove this.
- **Pages a plain GET cannot read** (JavaScript, PDFs, bot walls) count
  against the providers that return them; the per-provider unreadable share
  shows how much.
- **Pacing.** Providers are paced to half their own documented limits, so a
  slowly paced provider is queried up to about a minute after the others for
  the same item. The published spread shows the actual gap.
- **Specs.** A wrong registry field path counts as the provider's failure
  (`invalid_response` or missing excerpts). `bench smoke` checks the paths
  against live responses before a full run.
- **Judges.** Large language model judges have their own preferences; see
  section 6 for the second judge and the human gate.
- **Location.** One region per run (`BENCH_REGION`); providers that localize
  results may do better or worse elsewhere.

## 14. Known limits

- Every item comes from Wikidata. Search providers index Wikipedia heavily,
  so the head and multi-hop classes favour encyclopedic coverage. Other
  openly licensed sources are not yet built.
- There is no open-ended research class. Judged relevance runs only on
  known-answer queries.
- The page check reads only what a plain GET returns: pages that need
  JavaScript, PDFs, paywalls and sites that refuse unknown crawlers are
  unreadable for every provider. A provider whose results lean towards such
  pages gets less page credit; the per-provider unreadable share shows it.
- Freshness rests on software release data alone, and Wikidata can lag the
  real release.
- Ties need both statistical separation and 6 points, so close providers
  stay tied even with significant differences. This follows the owner's
  decision.
